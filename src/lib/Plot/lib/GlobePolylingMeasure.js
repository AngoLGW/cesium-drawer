import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import MidPoint from "../class/MidPoint";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, POLYLINE_MEASURE } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import ee from "../../../utils/eventEmitter";

class GlobePolylingMeasure {
  constructor(viewer, options, data) {
    let { lineColor, textColor, cb = () => {}, plot } = options;
    this.cb = cb;

    this.id = uuidv4.v4();
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.canvas = viewer.scene.canvas;
    this.camera = viewer.scene.camera;
    this.ellipsoid = viewer.scene.globe.ellipsoid;
    this.tooltip = new GlobeTooltip(viewer.container);
    this.color = new Color({ lineColor: lineColor, textColor: textColor });
    this.plot = plot;
    this.isValid = true; //本实例是否有效

    this.entity = null;
    this.positions = [];
    this.tempPositions = [];
    this.resetPositions = [];
    this.drawHandler = null;
    this.modifyHandler = null;
    this.floatingPoint = null;
    this.material = null;
    this.idMapIndex = {}; //点id与位置数组下标的映射
    this.markers = {}; //存储点图形

    this.material = Cesium.Color.fromCssColorString(this.color.lineColor);
    this.textMaterial = Cesium.Color.fromCssColorString(this.color.textColor);

    /**
     * 如果没有初始化数据，则开始绘制
     */
    if (!data) {
      this.drawPolylineEvent();
    } else {
      this.parseData(data);
      this.drawPolyline(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: POLYLINE_MEASURE,
      positions: this.positions,
      lineColor: this.color.lineColor,
      textColor: this.color.textColor,
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
    this.color = new Color({ lineColor: data.lineColor });
    this.material = Cesium.Color.fromCssColorString(this.color.lineColor);
    this.textMaterial = Cesium.Color.fromCssColorString(this.color.textColor);
  }

  /**
   * 仅当地图实体被remove时，重新绘制
   */
  reDraw() {
    this.drawPolyline(this.positions);
  }

  /**
   * 保存
   */
  save() {
    this.clear();
    this.drawPolyline(this.positions);
  }

  /**
   * 设置颜色
   * @param {*} color
   */
  setColor({ lineColor, textColor }) {
    if (lineColor) {
      this.color.lineColor = lineColor;
      this.material = Cesium.Color.fromCssColorString(this.color.lineColor);
      this.entity.polyline.material = this.material;
    }
    if (textColor) {
      this.color.textColor = textColor;
      this.textMaterial = Cesium.Color.fromCssColorString(this.color.textColor);
      this.entity.label.fillColor = this.textMaterial;
    }
  }

  /**
   * 编辑
   */
  editPlot() {
    if (!this.isValid) return;
    this.resetPositions = [...this.positions];
    this.editDynamicLine();
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
   * 绘制中间控制点
   * @param {*} cartesian
   */
  drawMidPoint(cartesian) {
    let midPoint = new MidPoint(this.viewer, cartesian).point;
    return midPoint;
  }

  /**
   * 绘制折线
   * @param {*} positions
   */
  drawPolyline(positions) {
    let _this = this;

    /**
     * 计算距离
     */
    let tip = _this.getMeasureTip(positions);

    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: POLYLINE_MEASURE,
      instanceId: _this.id,
      position: positions[0],
      label: {
        text: tip,
        font: '16px "微软雅黑", Arial, Helvetica, sans-serif, Helvetica',
        fillColor: _this.textMaterial,
        outlineWidth: 1,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      polyline: {
        positions,
        clampToGround: true,
        width: 8,
        material: _this.material,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态折线
   * @param {*} tempPositions
   */
  drawDynamicLine(tempPositions) {
    let _this = this;
    let dynamicPositions = new Cesium.CallbackProperty(function() {
      return tempPositions;
    }, false);

    /**
     * 计算距离
     */
    let labelDynamicPosition = new Cesium.CallbackProperty(function() {
      if (tempPositions.length > 1) {
        let tip = _this.getMeasureTip(tempPositions);
        _this.entity.label.text = tip;

        return tempPositions[0];
      } else {
        return null;
      }
    }, false);

    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: POLYLINE_MEASURE,
      instanceId: _this.id,
      position: labelDynamicPosition,
      label: {
        text: "",
        font: '16px "微软雅黑", Arial, Helvetica, sans-serif, Helvetica',
        fillColor: _this.textMaterial,
        outlineWidth: 1,
        style: Cesium.LabelStyle.FILL_AND_OUTLINE,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
      polyline: {
        positions: dynamicPositions,
        clampToGround: true,
        width: 8,
        material: _this.material,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 编辑时动态更新控制点
   */
  drawDynamicPoint() {
    let _this = this;
    let tempPositions = this.tempPositions;
    for (let i = 0; i < tempPositions.length; i++) {
      let ys = i % 2;
      if (ys == 0) {
        let point = _this.drawPoint(tempPositions[i]);
        _this.idMapIndex[point.id] = i;
        _this.markers[i] = point;
      } else {
        let midPoint = _this.drawMidPoint(tempPositions[i]);
        _this.idMapIndex[midPoint.id] = i;
        _this.markers[i] = midPoint;
      }
    }
  }

  /**
   * 绘制事件注册
   */
  drawPolylineEvent() {
    let _this = this;
    _this.drawHandler = new Cesium.ScreenSpaceEventHandler(this.canvas);

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
      /**
       * 点击处新增锚点
       */
      _this.positions.push(cartesian);
      let newPoint = _this.drawPoint(cartesian);
      let index = _this.positions.length - 1;
      _this.idMapIndex[newPoint.id] = index;
      _this.markers[index] = newPoint;

      /**
       * 如果第一次点击，则新增移动点
       */
      if (_this.positions.length === 1) {
        _this.positions.push(cartesian);
        _this.floatingPoint = _this.drawPoint(cartesian);
        _this.drawDynamicLine(_this.positions);
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    _this.drawHandler.setInputAction(function(event) {
      let position = event.endPosition;
      if (!Cesium.defined(position)) {
        return;
      }
      let ray = _this.camera.getPickRay(position);
      if (!Cesium.defined(ray)) {
        return;
      }
      let cartesian = _this.scene.globe.pick(ray, _this.scene);
      if (!Cesium.defined(cartesian)) {
        _this.tooltip.setVisible(false);
        return;
      }

      if (_this.positions.length < 1) {
        _this.tooltip.showAt(position, "<p>选择起点</p>");
        return;
      }
      let tip = "<p>点击添加下一个点</p>";
      if (_this.positions.length > 2) {
        tip += "<p>右键结束绘制</p>";
      }
      _this.tooltip.showAt(position, tip);

      _this.floatingPoint.position.setValue(cartesian);
      _this.positions[_this.positions.length - 1] = cartesian;
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    _this.drawHandler.setInputAction(function(movement) {
      if (_this.positions.length < 3) {
        //位置节点小于3个时点击右键取消画线
        _this.clear();
        //设置为无效状态
        _this.isValid = false;
        return;
      }
      _this.positions.pop();

      //进入编辑状态
      _this.editDynamicLine();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 编辑事件注册
   */
  editPolylineEvent() {
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

      if (entity.flag != "anchor" && entity.flag != "mid_anchor") {
        return;
      }
      pickedAnchor = entity;
      isMoving = true;
      _this.scene.screenSpaceCameraController.enableRotate = false;

      if (entity.flag == "anchor") {
        _this.tooltip.showAt(position, "<p>移动控制点</p>");
      }
      if (entity.flag == "mid_anchor") {
        _this.tooltip.showAt(position, "<p>移动创建新的控制点</p>");
      }
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

      if (entity.flag != "anchor" && entity.flag != "mid_anchor") {
        return;
      }
      pickedAnchor = entity;
      isMoving = false;
      _this.scene.screenSpaceCameraController.enableRotate = true;

      pickedAnchor.position.setValue(cartesian);
      let oid = _this.idMapIndex[pickedAnchor.id];
      _this.updatePosition(oid, cartesian);

      _this.tooltip.setVisible(false);
      if (pickedAnchor.flag == "mid_anchor") {
        _this.updateModifyAnchors(oid);
      }
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
      let oid = _this.idMapIndex[pickedAnchor.id];
      if (pickedAnchor.flag == "anchor") {
        pickedAnchor.position.setValue(cartesian);

        _this.updatePosition(oid, cartesian);
        //左右两个中点
        _this.updateNewMidAnchors(oid);
      } else if (pickedAnchor.flag == "mid_anchor") {
        pickedAnchor.position.setValue(cartesian);

        _this.updatePosition(oid, cartesian);
      }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
  }

  /**
   * 更新动态节点位置和静态节点位置
   * @param {*} oid
   * @param {*} position
   */
  updatePosition(oid, position) {
    this.tempPositions[oid] = position;
    if (oid % 2 === 0) {
      this.positions[oid / 2] = position;
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
    _this.markers = {};
  }

  /**
   * 编辑
   */
  editDynamicLine() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    /**
     * 计算编辑点位
     */
    _this.computeTempPositions();
    /**
     * 绘制动态线段
     */
    _this.drawDynamicLine(_this.tempPositions);
    /**
     * 绘制动态点位
     */
    _this.drawDynamicPoint();

    /**
     * 注册编辑事件
     */
    _this.editPolylineEvent();

    _this.showPanel();
  }

  /**
   * 显示编辑面板
   */
  showPanel() {
    this.plot.seletedInstance = this;
    ee.emit("panel", this);
  }

  /**
   * 编辑时动态计算点位
   * @param {*} oid
   */
  updateModifyAnchors(oid) {
    let _this = this;
    let num = _this.tempPositions.length;
    if (oid == 0 || oid == num - 1) {
      return;
    }
    //重新计算tempPositions
    let p = _this.tempPositions[oid];
    let p1 = _this.tempPositions[oid - 1];
    let p2 = _this.tempPositions[oid + 1];

    //计算中心
    let cp1 = _this.computeCenterPotition(p1, p);
    let cp2 = _this.computeCenterPotition(p, p2);

    //插入点
    let arr = [cp1, p, cp2];
    _this.tempPositions.splice(oid, 1, cp1, p, cp2);

    //positons插入点位置
    let pid = (oid - 1) / 2 + 1;
    _this.positions.splice(pid, 0, p);

    //重新加载锚点
    _this.clearAnchors();
    _this.drawDynamicPoint();
  }

  /**
   * 中间点调整时，改变点位数组
   * @param {*} oid
   */
  updateNewMidAnchors(oid) {
    let _this = this;
    if (oid == null || oid == undefined) {
      return;
    }
    //左边两个中点，oid2为临时中间点
    let oid1 = null;
    let oid2 = null;
    //右边两个中点，oid3为临时中间点
    let oid3 = null;
    let oid4 = null;

    let num = _this.tempPositions.length;
    if (oid == 0) {
      oid1 = num - 2;
      oid2 = num - 1;
      oid3 = oid + 1;
      oid4 = oid + 2;
    } else if (oid == num - 2) {
      oid1 = oid - 2;
      oid2 = oid - 1;
      oid3 = num - 1;
      oid4 = 0;
    } else {
      oid1 = oid - 2;
      oid2 = oid - 1;
      oid3 = oid + 1;
      oid4 = oid + 2;
    }

    let c1 = _this.tempPositions[oid1];
    let c = _this.tempPositions[oid];
    let c4 = _this.tempPositions[oid4];

    if (oid == 0) {
      let c3 = _this.computeCenterPotition(c4, c);
      _this.tempPositions[oid3] = c3;
      _this.markers[oid3].position.setValue(c3);
    } else if (oid == num - 1) {
      let c2 = _this.computeCenterPotition(c1, c);
      _this.tempPositions[oid2] = c2;
      _this.markers[oid2].position.setValue(c2);
    } else {
      let c2 = _this.computeCenterPotition(c1, c);
      let c3 = _this.computeCenterPotition(c4, c);
      _this.tempPositions[oid2] = c2;
      _this.tempPositions[oid3] = c3;
      _this.markers[oid2].position.setValue(c2);
      _this.markers[oid3].position.setValue(c3);
    }
  }

  /**
   * 计算中心点
   * @param {*} p1
   * @param {*} p2
   */
  computeCenterPotition(p1, p2) {
    let _this = this;
    let c1 = _this.ellipsoid.cartesianToCartographic(p1);
    let c2 = _this.ellipsoid.cartesianToCartographic(p2);
    let cm = new Cesium.EllipsoidGeodesic(c1, c2).interpolateUsingFraction(0.5);
    let cp = _this.ellipsoid.cartographicToCartesian(cm);
    return cp;
  }

  /**
   * 根据描绘点位，算出包含中心点位置数组
   */
  computeTempPositions() {
    let _this = this;
    let pnts = _this.positions;
    _this.tempPositions = [];

    for (let i = 1; i < pnts.length; i++) {
      let p1 = pnts[i - 1];
      let p2 = pnts[i];
      let cp = _this.computeCenterPotition(p1, p2);
      _this.tempPositions.push(p1);
      _this.tempPositions.push(cp);
    }
    let last = pnts[pnts.length - 1];
    _this.tempPositions.push(last);
  }

  /**
   * 计算距离
   * @param {*} pntList
   */
  getMeasureTip(pntList) {
    var _this = this;
    var dis3d = _this.computeLineDis3d(pntList);
    dis3d = dis3d.toFixed(3);
    var tip = "距离：" + dis3d + "千米";
    return tip;
  }

  computeLineDis3d(pntList) {
    var _this = this;
    var total = 0;
    for (var i = 1; i < pntList.length; i++) {
      var p1 = pntList[i - 1];
      var p2 = pntList[i];
      var dis = _this.computeDis3d(p1, p2);
      total += dis;
    }
    return total;
  }

  computeDis3d(p1, p2) {
    var dis = Cesium.Cartesian3.distance(p1, p2) / 1000;
    return dis;
  }
}

export default GlobePolylingMeasure;
