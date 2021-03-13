import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, CIRCLE } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import ee from "../../../utils/eventEmitter";

class GlobeCircleDrawer {
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
      this.drawCircleEvent();
    } else {
      this.parseData(data);
      this.drawCircle(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: CIRCLE,
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
    this.drawCircle(this.positions);
  }

  /**
   * 保存
   */
  save() {
    this.clear();
    this.drawCircle(this.positions);
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
    this.editDynamicCircle();
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
   * 绘制圆形
   * @param {*} positions
   */
  drawCircle(positions) {
    let _this = this;
    let pnts = this.computeCirclePolygon(positions);
    let dis = this.computeCircleRadius3D(positions);
    dis = (dis / 1000).toFixed(3);
    let text = dis + "km";
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: CIRCLE,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: pnts,
        asynchronous: false,
        material: _this.material,
      }),
      polyline: {
        positions: pnts,
        clampToGround: true,
        width: 3,
        material: _this.edgeMaterial,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态圆形
   * @param {*} positions
   */
  drawDynamicCircle(positions) {
    let _this = this;
    let dynamicHierarchy = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let pnts = _this.computeCirclePolygon(positions);
        let pHierarchy = new Cesium.PolygonHierarchy(pnts);
        return pHierarchy;
      } else {
        return null;
      }
    }, false);
    let lineDynamicPositions = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let pnts = _this.computeCirclePolygon(positions);
        return pnts;
      } else {
        return null;
      }
    }, false);
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: CIRCLE,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: dynamicHierarchy,
        material: _this.material,
      }),
      polyline: {
        positions: lineDynamicPositions,
        clampToGround: true,
        width: 3,
        material: _this.edgeMaterial,
      },
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 计算圆形环点位
   * @param {*} positions
   */
  computeCirclePolygon(positions) {
    let _this = this;

    try {
      if (!positions || positions.length < 2) {
        return null;
      }
      let cp = positions[0];
      let r = _this.computeCircleRadius3D(positions);
      let pnts = _this.computeCirclePolygon2(cp, r);
      return pnts;
    } catch (err) {
      return null;
    }
  }

  /**
   * 计算三维半径
   * @param {*} positions
   */
  computeCircleRadius3D(positions) {
    let distance = 0;
    let c1 = positions[0];
    let c2 = positions[1];
    let x = Math.pow(c1.x - c2.x, 2);
    let y = Math.pow(c1.y - c2.y, 2);
    let z = Math.pow(c1.z - c2.z, 2);
    let dis = Math.sqrt(x + y + z);
    return dis;
  }

  computeCenterPotition(p1, p2) {
    let _this = this;
    let c1 = _this.ellipsoid.cartesianToCartographic(p1);
    let c2 = _this.ellipsoid.cartesianToCartographic(p2);
    let cm = new Cesium.EllipsoidGeodesic(c1, c2).interpolateUsingFraction(0.5);
    let cp = _this.ellipsoid.cartographicToCartesian(cm);
    return cp;
  }

  computeCirclePolygon2(center, radius) {
    let _this = this;

    try {
      if (!center || radius <= 0) {
        return null;
      }
      let cep = Cesium.EllipseGeometryLibrary.computeEllipsePositions(
        {
          center: center,
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          rotation: 0,
          granularity: 0.005,
        },
        false,
        true
      );
      if (!cep || !cep.outerPositions) {
        return null;
      }
      let pnts = Cesium.Cartesian3.unpackArray(cep.outerPositions);
      let first = pnts[0];
      pnts[pnts.length] = first;
      return pnts;
    } catch (err) {
      return null;
    }
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
   * 编辑动态圆形
   */
  editDynamicCircle() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    /**
     * 绘制动态矩形
     */
    this.drawDynamicCircle(_this.positions);

    /**
     * 绘制动态点位
     */
    this.drawDynamicPoint();

    /**
     * 注册编辑事件
     */
    this.drawDynamicCircleEvent();

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
   * 注册绘制圆形事件
   */
  drawCircleEvent() {
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

      if (num === 1) {
        _this.positions.push(cartesian);
        _this.floatingPoint = _this.drawPoint(cartesian);
        _this.drawDynamicCircle(_this.positions);
      }
      if (num > 2) {
        _this.positions.pop();
        _this.editDynamicCircle();
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
      _this.tooltip.showAt(position, "<p>选择终点</p>");

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
   * 注册编辑圆形事件
   */
  drawDynamicCircleEvent() {
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

export default GlobeCircleDrawer;
