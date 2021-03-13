import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, LABEL } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import ee from "../../../utils/eventEmitter";

class GlobeLabelDrawer {
  constructor(viewer, options, data) {
    let { textColor, bgColor, cb = () => {}, plot } = options;
    this.cb = cb;

    this.id = uuidv4.v4();
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.canvas = viewer.scene.canvas;
    this.camera = viewer.scene.camera;
    this.ellipsoid = viewer.scene.globe.ellipsoid;
    this.tooltip = new GlobeTooltip(viewer.container);
    this.color = new Color({ textColor, bgColor });
    this.plot = plot;
    this.isValid = true; //本实例是否有效

    this.entity = null;
    this.positions = [];
    this.resetPositions = [];
    this.drawHandler = null;
    this.modifyHandler = null;
    this.floatingPoint = null;
    this.label = "";

    /**
     * 材质
     */
    this.material = Cesium.Color.fromCssColorString(this.color.textColor);
    this.bgMaterial = Cesium.Color.fromCssColorString(this.color.bgColor);

    /**
     * 如果没有初始化数据，则开始绘制
     */
    if (!data) {
      this.drawLabelEvent();
    } else {
      this.parseData(data);
      this.drawLabel(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: LABEL,
      positions: this.positions,
      textColor: this.color.textColor,
      bgColor: this.color.bgColor,
      label: this.label,
    };
  }

  /**
   * 解析数据，用于从数据库获取数据生成对象
   */
  parseData(data) {
    let { x, y, z } = data.positions[0];
    this.positions = [new Cesium.Cartesian3(x, y, z)];
    this.color = new Color({
      textColor: data.textColor,
      bgColor: data.bgColor,
    });
    this.material = Cesium.Color.fromCssColorString(this.color.textColor);
    this.bgMaterial = Cesium.Color.fromCssColorString(this.color.bgColor);
    this.label = data.label;
  }

  /**
   * 仅当地图实体被remove时，重新绘制
   */
  reDraw() {
    this.drawLabel(this.positions);
  }

  /**
   * 保存
   */
  save() {
    this.clear();
    this.drawLabel(this.positions);
  }

  /**
   * 设置颜色
   * @param {*} color
   */
  setColor({ textColor, bgColor }) {
    if (textColor) {
      this.color.textColor = textColor;
      this.material = Cesium.Color.fromCssColorString(this.color.textColor);
      this.entity.label.fillColor = this.material;
    }
    if (bgColor) {
      this.color.bgColor = bgColor;
      this.bgMaterial = Cesium.Color.fromCssColorString(this.color.bgColor);
      this.entity.label.backgroundColor = this.bgMaterial;
    }
  }

  /**
   * 设置文本
   * @param {*} text
   */
  setText(text) {
    this.label = text;
    this.entity.label.text = this.label;
  }

  /**
   * 编辑
   */
  editPlot() {
    if (!this.isValid) return;
    this.resetPositions = this.positions;
    this.editDynamicLabel();
  }

  /**
   * 删除
   */
  delPlot() {
    if (!this.isValid) return;

    this.isValid = false;
    this.clear();
  }

  /**
   * 绘制控制点
   * @param {*} cartesian
   */
  drawPoint(cartesian) {
    let point = new Point(this.viewer, cartesian).point;
    return point;
  }

  /**
   * 绘制文本
   * @param {*} positions
   */
  drawLabel(positions) {
    let _this = this;
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: LABEL,
      instanceId: _this.id,
      position: positions[0],
      label: {
        text: _this.label,
        font: '16px "微软雅黑", Arial, Helvetica, sans-serif, Helvetica',
        fillColor: _this.material,
        outlineColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -25),
        showBackground: true,
        backgroundColor: _this.bgMaterial,
      },
    };
    _this.entity = this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态文本
   * @param {*} position
   */
  drawDynamicLabel(positions) {
    let _this = this;
    let dynamicPosition = new Cesium.CallbackProperty(function() {
      return positions[0];
    }, false);
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: LABEL,
      instanceId: _this.id,
      position: dynamicPosition,
      label: {
        text: _this.label,
        font: '16px "微软雅黑", Arial, Helvetica, sans-serif, Helvetica',
        fillColor: _this.material,
        outlineColor: Cesium.Color.WHITE,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
        pixelOffset: new Cesium.Cartesian2(0, -25),
        showBackground: true,
        backgroundColor: _this.bgMaterial,
      },
    };
    _this.entity = this.viewer.entities.add(bData);
  }

  /**
   * 编辑动态文本
   */
  editDynamicLabel() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    this.drawDynamicLabel(this.positions);

    /**
     * 绘制动态点位
     */
    this.floatingPoint = this.drawPoint(this.positions[0]);

    /**
     * 注册编辑事件
     */
    this.drawDynamicLabelEvent();

    /**
     * 显示编辑面板
     */
    this.showPanel();
  }

  /**
   * 显示编辑面板
   */
  showPanel() {
    this.plot.seletedInstance = this;
    ee.emit("panel", this);
  }

  /**
   * 注册绘制文本事件
   */
  drawLabelEvent() {
    let _this = this;
    _this.drawHandler = new Cesium.ScreenSpaceEventHandler(_this.canvas);

    _this.drawHandler.setInputAction(function(event) {
      var wp = event.position;
      if (!Cesium.defined(wp)) {
        return;
      }
      var ray = _this.camera.getPickRay(wp);
      if (!Cesium.defined(ray)) {
        return;
      }
      var cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }
      _this.positions[0] = cartesian;

      _this.editDynamicLabel();
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    _this.drawHandler.setInputAction(function(event) {
      var wp = event.endPosition;
      if (!Cesium.defined(wp)) {
        return;
      }

      _this.tooltip.showAt(wp, "<p>选择位置</p>");

      var ray = _this.camera.getPickRay(wp);
      if (!Cesium.defined(ray)) {
        return;
      }
      var cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }
      _this.positions[0] = cartesian;
      if (_this.floatingPoint == null) {
        _this.floatingPoint = _this.drawPoint(cartesian);
      } else {
        _this.floatingPoint.position.setValue(cartesian);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //右键取消
    _this.drawHandler.setInputAction(function(event) {
      _this.clear();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 注册编辑事件
   */
  drawDynamicLabelEvent() {
    var _this = this;
    var isMoving = false;
    var pickedAnchor = null;

    _this.modifyHandler = new Cesium.ScreenSpaceEventHandler(_this.canvas);

    _this.modifyHandler.setInputAction(function(event) {
      let position = event.position;
      if (!Cesium.defined(position)) {
        return;
      }
      let ray = _this.camera.getPickRay(position);
      if (!Cesium.defined(ray)) {
        return;
      }
      let cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }
      let pickedObject = _this.scene.pick(position);
      if (!Cesium.defined(pickedObject)) {
        return;
      }
      if (!Cesium.defined(pickedObject.id)) {
        return;
      }
      let entity = pickedObject.id;
      if (entity.flag != "anchor") {
        return;
      }
      pickedAnchor = entity;
      isMoving = true;
      _this.scene.screenSpaceCameraController.enableRotate = false;

      _this.tooltip.showAt(position, "<p>移动控制点</p>");
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    _this.modifyHandler.setInputAction(function(event) {
      let position = event.position;
      if (!Cesium.defined(position)) {
        return;
      }
      let ray = _this.camera.getPickRay(position);
      if (!Cesium.defined(ray)) {
        return;
      }
      let cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }
      let pickedObject = _this.scene.pick(position);
      if (!Cesium.defined(pickedObject)) {
        return;
      }
      if (!Cesium.defined(pickedObject.id)) {
        return;
      }
      let entity = pickedObject.id;
      if (entity.flag != "anchor") {
        return;
      }
      pickedAnchor = entity;
      isMoving = false;
      _this.scene.screenSpaceCameraController.enableRotate = true;

      _this.positions[0] = cartesian;
      _this.tooltip.setVisible(false);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    _this.modifyHandler.setInputAction(function(event) {
      if (!isMoving) {
        return;
      }
      let position = event.endPosition;
      if (!Cesium.defined(position)) {
        return;
      }
      _this.tooltip.showAt(position, "<p>移动控制点</p>");

      let ray = _this.camera.getPickRay(position);
      if (!Cesium.defined(ray)) {
        return;
      }
      let cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }

      pickedAnchor.position.setValue(cartesian);
      _this.positions[0] = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 清空数据
   */
  clear() {
    let _this = this;
    if (_this.drawHandler) {
      _this.drawHandler.destroy();
      _this.drawHandler = null;
    }
    if (_this.modifyHandler) {
      _this.modifyHandler.destroy();
      _this.modifyHandler = null;
    }
    if (_this.floatingPoint) {
      _this.viewer.entities.remove(_this.floatingPoint);
      _this.floatingPoint = null;
    }
    if (_this.entity) {
      _this.viewer.entities.remove(_this.entity);
      _this.entity = null;
    }
    _this.tooltip.setVisible(false);
  }
}

export default GlobeLabelDrawer;
