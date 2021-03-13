import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, ELLIPSE } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import * as turf from "@turf/turf";
import ee from "../../../utils/eventEmitter";

class GlobeEllipseDrawer {
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
      this.drawEllipseEvent();
    } else {
      this.parseData(data);
      this.drawEllipse(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: ELLIPSE,
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
    this.drawEllipse(this.positions);
  }

  /**
   * 保存
   */
  save() {
    this.clear();
    this.drawEllipse(this.positions);
  }

  /**
   * 设置颜色
   * @param {*} color
   */
  setColor({ fillColor, edgeColor }) {
    if (fillColor) {
      this.color.fillColor = fillColor;
      this.material = Cesium.Color.fromCssColorString(this.color.fillColor);
      this.entity.ellipse.material = this.material;
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
    this.editDynamicEllipse();
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
   * 绘制椭圆
   */
  drawEllipse(positions) {
    let _this = this;
    let axis = _this.getAxis(positions);
    let rotation = _this.bearing(positions[0], positions[1]);

    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: ELLIPSE,
      instanceId: _this.id,
      position: axis.midPosition,
      ellipse: {
        semiMajorAxis: axis.semiMajorAxis,
        semiMinorAxis: axis.semiMinorAxis,
        rotation: rotation,
        material: _this.material,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态椭圆
   */
  drawDynamicEllipse(positions) {
    let _this = this;
    if (positions.length < 3) return;

    let dynamicRotation = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        return _this.bearing(positions[0], positions[1]);
      } else {
        return null;
      }
    }, false);

    let dynamicMidPosition = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        return _this.computeCenterPotition(positions[0], positions[1]);
      } else {
        return null;
      }
    }, false);
    let DynamicSemiMajorAxis = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let semiMajorAxis = _this.computeDis3d(positions[0], positions[1]) / 2;
        return semiMajorAxis;
      } else {
        return null;
      }
    }, false);
    let DynamicSemiMinorAxis = new Cesium.CallbackProperty(function() {
      if (positions.length > 2) {
        let semiMajorAxis = DynamicSemiMajorAxis.getValue(
          Cesium.JulianDate.now()
        );
        let semiMinorAxis = _this.pointToLineDistance(
          positions[2],
          positions[0],
          positions[1]
        );
        return semiMajorAxis > semiMinorAxis ? semiMinorAxis : semiMajorAxis;
      } else {
        return null;
      }
    }, false);
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: ELLIPSE,
      instanceId: _this.id,
      position: dynamicMidPosition,
      ellipse: {
        semiMajorAxis: DynamicSemiMajorAxis,
        semiMinorAxis: DynamicSemiMinorAxis,
        rotation: dynamicRotation,
        material: _this.material,
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
   * 计算两点距离
   * @param {*} p1
   * @param {*} p2
   */
  computeDis3d(p1, p2) {
    var dis = Cesium.Cartesian3.distance(p1, p2);
    return dis;
  }

  /**
   * 计算两点的角度
   * @param {*} p1
   * @param {*} p2
   */
  bearing(p1, p2) {
    let n1 = this.getLonLat(p1),
      n2 = this.getLonLat(p2);
    let point1 = turf.point([n1.lon, n1.lat]),
      point2 = turf.point([n2.lon, n2.lat]);
    return -(turf.bearing(point1, point2) * Math.PI) / 180 + Math.PI / 2;
  }

  /**
   * 点到线的距离
   */
  pointToLineDistance(point, pnt1, pnt2) {
    let p = this.getLonLat(point),
      lp1 = this.getLonLat(pnt1),
      lp2 = this.getLonLat(pnt2);
    let np = turf.point([p.lon, p.lat]);
    let nl = turf.lineString([
      [lp1.lon, lp1.lat],
      [lp2.lon, lp2.lat],
    ]);
    let dis = turf.pointToLineDistance(np, nl) * 1000;
    return dis;
  }

  /**
   * 获取长轴，短轴及中心点
   * @param {*} positions
   */
  getAxis(positions) {
    if (positions.length < 3) return;
    let midPosition = this.computeCenterPotition(positions[0], positions[1]);
    let semiMajorAxis = this.computeDis3d(positions[0], positions[1]) / 2;
    let semiMinorAxis = this.pointToLineDistance(
      positions[2],
      positions[0],
      positions[1]
    );
    semiMinorAxis =
      semiMinorAxis < semiMajorAxis ? semiMinorAxis : semiMajorAxis;
    return { midPosition, semiMajorAxis, semiMinorAxis };
  }

  /**
   * 编辑动态攻击箭头
   */
  editDynamicEllipse() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    /**
     * 绘制动态攻击箭头
     */
    this.drawDynamicEllipse(_this.positions);

    /**
     * 绘制动态点位
     */
    this.drawDynamicPoint();

    /**
     * 注册编辑事件
     */
    this.drawDynamicEllipseEvent();

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
  drawEllipseEvent() {
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
      }

      if (num == 3) {
        _this.drawDynamicEllipse(_this.positions);
      }

      if (num == 4) {
        _this.positions.pop();
        _this.editDynamicEllipse();
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    _this.drawHandler.setInputAction(function(event) {
      let position = event.endPosition;
      if (!Cesium.defined(position)) {
        return;
      }
      if (_this.positions.length < 1) {
        _this.tooltip.showAt(position, "<p>绘制长轴，选择第一个点</p>");
        return;
      } else if (_this.positions.length < 2) {
        _this.tooltip.showAt(position, "<p>绘制长轴，选择第二个点</p>");
        return;
      }
      _this.tooltip.showAt(position, "<p>绘制短轴, 选择点</p>");

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
      _this.clear();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
  }

  /**
   * 注册编辑事件
   */
  drawDynamicEllipseEvent() {
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

export default GlobeEllipseDrawer;
