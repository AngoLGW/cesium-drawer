import GlobeTooltip from "../class/GlobeTooltip";
import Point from "../class/Point";
import Tconfirm from "../class/Tconfirm";
import Color from "../class/Color";
import { GLOBE_PLOT_LAYER, STRAIGHT_ARROW } from "../config/constant";
import * as Cesium from "cesium";
import { v4 as uuidv4 } from "uuid";
import xp from "../utils/algorithm";

class PlotStraightArrowDrawer {
  constructor(viewer, options, data) {
    let { color, cb = () => {} } = options;
    this.cb = cb;

    this.id = uuidv4.v4();
    this.viewer = viewer;
    this.scene = viewer.scene;
    this.canvas = viewer.scene.canvas;
    this.camera = viewer.scene.camera;
    this.ellipsoid = viewer.scene.globe.ellipsoid;
    this.tooltip = new GlobeTooltip(viewer.container);
    this.color = new Color(color);
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
    this.material = Cesium.Color.fromCssColorString(this.color.color);
    this.outlineMaterial = new Cesium.PolylineDashMaterialProperty({
      dashLength: 16,
      color: Cesium.Color.fromCssColorString(this.color.color),
    });

    /**
     * 如果没有初始化数据，则开始绘制
     */
    if (!data) {
      this.drawStraightArrowEvent();
    } else {
      this.parseData(data);
      this.drawStraightArrow(this.positions);
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  getData() {
    return {
      shape: STRAIGHT_ARROW,
      positions: this.positions,
      color: this.color.color,
    };
  }

  /**
   * 解析数据，用于从数据库获取数据生成对象
   */
  parseData(data) {
    data.positions.forEach(val => {
      let { x, y, z } = val;
      val = new Cesium.Cartesian3(x, y, z);
    });
    this.positions = data.positions;
    this.color = new Color(data.color);
    this.material = Cesium.Color.fromCssColorString(data.color);
  }

  /**
   * 仅当地图实体被remove时，重新绘制
   */
  reDraw() {
    this.drawStraightArrow(this.positions);
  }

  /**
   * 编辑
   */
  editPlot() {
    if (!this.isValid) return;
    this.resetPositions = [...this.positions];
    this.editDynamicStraightArrow();
  }

  /**
   * 删除
   */
  delPlot() {
    if (!this.isValid) return;

    /**
     * 确认框
     */
    new Tconfirm(
      () => {
        this.isValid = false;
        this.clear();
      },
      () => {},
      {
        okText: "确定删除?",
      }
    );
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
   * 绘制粗直线箭头
   */
  drawStraightArrow(positions) {
    let _this = this;
    let firstPoint = _this.getLonLat(positions[0]);
    let endPoints = _this.getLonLat(positions[1]);
    let arrow = xp.algorithm.fineArrow(
      [firstPoint.lon, firstPoint.lat],
      [endPoints.lon, endPoints.lat]
    );
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: STRAIGHT_ARROW,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: arrow,
        asynchronous: false,
        material: _this.material,
      }),
    };
    _this.entity = _this.viewer.entities.add(bData);
  }

  /**
   * 绘制动态粗直线箭头
   */
  drawDynamicStraightArrow(positions) {
    let _this = this;
    let dynamicHierarchy = new Cesium.CallbackProperty(function() {
      if (positions.length > 1) {
        let p1 = _this.positions[0];
        let p2 = _this.positions[1];
        if (_this.isSimpleXYZ(p1, p2)) {
          return null;
        }
        let firstPoint = _this.getLonLat(p1);
        let endPoints = _this.getLonLat(p2);
        let arrow = xp.algorithm.fineArrow(
          [firstPoint.lon, firstPoint.lat],
          [endPoints.lon, endPoints.lat]
        );
        let pHierarchy = new Cesium.PolygonHierarchy(arrow);
        return pHierarchy;
      } else {
        return null;
      }
    }, false);
    console.log(dynamicHierarchy);
    let bData = {
      layerId: GLOBE_PLOT_LAYER,
      shape: STRAIGHT_ARROW,
      instanceId: _this.id,
      polygon: new Cesium.PolygonGraphics({
        hierarchy: dynamicHierarchy,
        material: _this.material,
      }),
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

  isSimpleXYZ(p1, p2) {
    if (p1.x == p2.x && p1.y == p2.y && p1.z == p2.z) {
      return true;
    }
    return false;
  }

  /**
   * 编辑动态粗直线箭头
   */
  editDynamicStraightArrow() {
    let _this = this;

    /**
     * 清除
     */
    _this.clear();

    /**
     * 确认框
     */
    new Tconfirm(
      () => {
        _this.clear();
        _this.drawStraightArrow(_this.positions);
        _this.cb();
      },
      () => {
        _this.clear();
        /**
         * 不是编辑情况的取消，直接删除
         */
        if (!_this.resetPositions.length) {
          //设置为无效状态
          _this.isValid = false;
          return;
        }
        _this.drawStraightArrow(_this.resetPositions);
        _this.positions = [..._this.resetPositions];
        _this.cb();
      }
    );

    /**
     * 绘制动态粗直线箭头
     */
    this.drawDynamicStraightArrow(_this.positions);

    /**
     * 绘制动态点位
     */
    this.drawDynamicPoint();

    /**
     * 注册编辑事件
     */
    this.drawDynamicStraightArrowEvent();
  }

  /**
   * 注册绘制粗直线箭头事件
   */
  drawStraightArrowEvent() {
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
        _this.drawDynamicStraightArrow(_this.positions);
      }

      if (num > 2) {
        _this.positions.pop();
        _this.editDynamicStraightArrow(_this.positions);
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
   * 注册编辑事件
   */
  drawDynamicStraightArrowEvent() {
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
      if (isMoving) {
        isMoving = false;
        pickedAnchor.position.setValue(cartesian);
        let oid = _this.idMapIndex[pickedAnchor.id];
        _this.positions[oid] = cartesian;
        _this.tooltip.setVisible(false);
      } else {
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
        _this.tooltip.showAt(position, "<p>移动控制点</p>");
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

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

export default PlotStraightArrowDrawer;
