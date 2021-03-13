import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, ATTACK_ARROW } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import xp from "../utils/algorithm";
import ee from "../../../utils/eventEmitter";

class PlotAttackArrowDrawer {
  constructor(viewer, options, data) {
    let { fillColor, edgeColor, cb = () => {}, plot } = options;
    this.cb = cb;

    this.id = uuidv4.v4();
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.canvas = viewer.scene.canvas;
    this.camera = viewer.scene.camera;
    this.ellipsoid = viewer.scene.globe.ellipsoid;
    this.tooltip = new GlobeTooltip(viewer.container);
    this.color = new Color({ fillColor, edgeColor });
    this.plot = plot;
    this.isValid = true; //本实例是否有效

    this.entity = null;
    this.positions = [];
    this.resetPositions = [];
    this.drawHandler = null;
    this.modifyHandler = null;
    this.floatingPoint = null;
    this.idMapIndex = {}; //点id与位置数组下标的映射

    /**
     * 材质
     */
    this.material = Cesium.Color.fromCssColorString(this.color.fillColor);
    this.edgeMaterial = new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.fromCssColorString(this.color.edgeColor),
    });

    /**
     * 如果没有初始化数据，则开始绘制
     */
    if (!data) {
      this.drawAttackArrowEvent();
    } else {
      this.parseData(data);
      this.drawAttackArrow(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: ATTACK_ARROW,
      positions: this.positions,
      fillColor: this.color.fillColor,
      edgeColor: this.color.edgeColor,
    };
  }

  /**
   * 解析数据，用于从数据库获取数据生成对象
   */
  parseData(data) {
    data.positions.forEach((val) => {
      let { x, y, z } = val;
      val = new Cesium.Cartesian3(x, y, z);
    });
    this.positions = data.positions;
    this.color = new Color({
      fillColor: data.fillColor,
      edgeColor: data.edgeColor,
    });
    this.material = Cesium.Color.fromCssColorString(this.color.fillColor);
    this.edgeMaterial = new Cesium.PolylineDashMaterialProperty({
      color: Cesium.Color.fromCssColorString(this.color.edgeColor),
    });
  }

  /**
   * 仅当地图实体被remove时，重新绘制
   */
  reDraw() {
    this.drawAttackArrow(this.positions);
  }

  /**
   * 保存
   */
  save() {
    this.clear();
    this.drawAttackArrow(this.positions);
  }

  /**
   * 设置颜色
   * @param {*} color
   */
  setColor({ fillColor, edgeColor }) {
    if (fillColor) {
      this.color.fillColor = fillColor;
      this.material = Cesium.Color.fromCssColorString(this.color.fillColor);
      this.entity.polygon.material = this.material;
    }
    if (edgeColor) {
      this.color.edgeColor = edgeColor;
      this.edgeMaterial = new Cesium.PolylineDashMaterialProperty({
        color: Cesium.Color.fromCssColorString(this.color.edgeColor),
      });
      this.entity.polyline.material = this.edgeMaterial;
    }
  }

  /**
   * 编辑
   */
  editPlot() {
    if (!this.isValid) return;
    this.resetPositions = [...this.positions];
    this.editDynamicAttackArrow();
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
   * 绘制攻击箭头
   */
  drawAttackArrow(positions) {
    let _this = this;
    let lonLats = _this.getLonLatArr(positions);
    let doubleArrow = xp.algorithm.tailedAttackArrow(lonLats);
    let arrowPositions = doubleArrow.polygonalPoint;

    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: ATTACK_ARROW,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: arrowPositions,
        asynchronous: false,
        material: _this.material,
      }),
      polyline: {
        positions: arrowPositions,
        clampToGround: true,
        width: 3,
        material: _this.edgeMaterial,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态攻击箭头
   */
  drawDynamicAttackArrow(positions) {
    let _this = this;
    let dynamicHierarchy = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let lonLats = _this.getLonLatArr(positions);
        let doubleArrow = xp.algorithm.tailedAttackArrow(lonLats);
        let arrowPositions = doubleArrow.polygonalPoint;
        if (arrowPositions == null || arrowPositions.length < 3) {
          return null;
        }
        let pHierarchy = new Cesium.PolygonHierarchy(arrowPositions);
        return pHierarchy;
      } else {
        return null;
      }
    }, false);
    let dynamicPositions = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let lonLats = _this.getLonLatArr(positions);
        let doubleArrow = xp.algorithm.tailedAttackArrow(lonLats);
        let arrowPositions = doubleArrow.polygonalPoint;
        if (arrowPositions == null || arrowPositions.length < 3) {
          return null;
        }
        return arrowPositions;
      } else {
        return null;
      }
    }, false);
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: ATTACK_ARROW,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: dynamicHierarchy,
        material: _this.material,
      }),
      polyline: {
        positions: dynamicPositions,
        clampToGround: true,
        width: 3,
        material: _this.edgeMaterial,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态点位
   */
  drawDynamicPoint() {
    for (let i = 0; i < this.positions.length; i++) {
      let point = this.drawPoint(this.positions[i]);
      this.idMapIndex[point.id] = i;
    }
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
    if (Object.keys(_this.idMapIndex).length > 0) {
      this.clearAnchors();
    }
    _this.tooltip.setVisible(false);
  }

  /**
   * 清除锚点
   */
  clearAnchors() {
    let _this = this;
    for (let key in _this.idMapIndex) {
      _this.viewer.entities.removeById(key);
    }
    _this.idMapIndex = {};
  }

  /**
   * 转换经纬度
   * @param {*} cartesian
   */
  getLonLat(cartesian) {
    let _this = this;
    let cartographic = _this.ellipsoid.cartesianToCartographic(cartesian);
    cartographic.height = _this.viewer.scene.globe.getHeight(cartographic);
    let pos = {
      lon: cartographic.longitude,
      lat: cartographic.latitude,
      alt: cartographic.height,
    };
    pos.lon = Cesium.Math.toDegrees(pos.lon);
    pos.lat = Cesium.Math.toDegrees(pos.lat);
    return pos;
  }

  getLonLatArr(positions) {
    let _this = this;
    let arr = [];
    for (let i = 0; i < positions.length; i++) {
      let p = _this.getLonLat(positions[i]);
      if (p != null) {
        arr.push([p.lon, p.lat]);
      }
    }
    return arr;
  }

  isSimpleXYZ(p1, p2) {
    if (p1.x == p2.x && p1.y == p2.y && p1.z == p2.z) {
      return true;
    }
    return false;
  }

  /**
   * 编辑动态攻击箭头
   */
  editDynamicAttackArrow() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    /**
     * 绘制动态攻击箭头
     */
    this.drawDynamicAttackArrow(_this.positions);

    /**
     * 绘制动态点位
     */
    this.drawDynamicPoint();

    /**
     * 注册编辑事件
     */
    this.drawDynamicAttackArrowEvent();

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
   * 注册绘制攻击箭头事件
   */
  drawAttackArrowEvent() {
    let _this = this;
    _this.drawHandler = new Cesium.ScreenSpaceEventHandler(_this.canvas);

    _this.drawHandler.setInputAction(function(event) {
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

      _this.positions.push(cartesian);
      let newPoint = _this.drawPoint(cartesian);
      let index = _this.positions.length - 1;
      _this.idMapIndex[newPoint.id] = index;

      let num = _this.positions.length;
      /**
       * 如果第一次点击，则新增移动点
       */

      if (num == 1) {
        _this.positions.push(cartesian);
        _this.floatingPoint = _this.drawPoint(cartesian);
        _this.drawDynamicAttackArrow(_this.positions);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    _this.drawHandler.setInputAction(function(event) {
      let position = event.endPosition;
      if (!Cesium.defined(position)) {
        return;
      }
      if (_this.positions.length < 1) {
        _this.tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }
      _this.tooltip.showAt(position, "<p>新增控制点</p><p>右键结束绘制</p>");

      let ray = _this.camera.getPickRay(position);
      if (!Cesium.defined(ray)) {
        return;
      }
      let cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        return;
      }
      _this.floatingPoint.position.setValue(cartesian);
      _this.positions[_this.positions.length - 1] = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    //右键取消
    _this.drawHandler.setInputAction(function(event) {
      if (_this.positions.length < 4) {
        //位置节点小于4个时点击右键取消画线
        _this.clear();
        return;
      }
      _this.positions.pop();
      _this.editDynamicAttackArrow();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 注册编辑事件
   */
  drawDynamicAttackArrowEvent() {
    let _this = this;
    let isMoving = false;
    let pickedAnchor = null;

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

      pickedAnchor.position.setValue(cartesian);
      let oid = _this.idMapIndex[pickedAnchor.id];
      _this.positions[oid] = cartesian;
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
      let oid = _this.idMapIndex[pickedAnchor.id];
      _this.positions[oid] = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }
}

export default PlotAttackArrowDrawer;
