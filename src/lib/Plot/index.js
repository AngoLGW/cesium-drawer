import GlobePolylineDrawer from "./lib/GlobePolylineDrawer";
import GlobePolylineMeasure from "./lib/GlobePolylingMeasure";
import GlobeRectangleDrawer from "./lib/GlobeRectangleDrawer";
import GlobeCircleDrawer from "./lib/GlobeCircleDrawer";
import GlobeCircleMeasure from "./lib/GlobeCircleMeasure";
import GlobePolygonDrawer from "./lib/GlobePolygonDrawer";
import GlobePolygonMeasure from "./lib/GlobePolygonMeasure";
import GlobeLabelDrawer from "./lib/GlobeLabelDrawer";
import PlotAttackArrowDrawer from "./lib/PlotAttackArrowDrawer";
import GlobeEllipseDrawer from "./lib/GlobeEllipseDrawer";
import PlotStraightArrow3Drawer from "./lib/PlotStraightArrow3Drawer";
import PlotStraightArrow4Drawer from "./lib/PlotStraightArrow4Drawer";
import ee from "../../utils/eventEmitter";

import {
  GLOBE_PLOT_LAYER,
  POINT,
  POLYLINE,
  RECTANGLE,
  CIRCLE,
  POLYLINE_MEASURE,
  CIRCLE_MEASURE,
  POLYGON,
  POLYGON_MEASURE,
  LABEL,
  STRAIGHT_ARROW,
  STRAIGHT_ARROW_2,
  STRAIGHT_ARROW_3,
  STRAIGHT_ARROW_4,
  ATTACK_ARROW,
  ELLIPSE,
} from "./config/constant";
import GlobeTooltip from "./class/GlobeTooltip";
import * as Cesium from "cesium";

class Plot {
  constructor(viewer, options = {}) {
    this.viewer = viewer;
    this.canvas = viewer.scene.canvas;
    let { cb = () => {} } = options;

    this.cb = cb;

    this.tooltip = new GlobeTooltip(viewer.container);

    this.shapeDic = {
      [POLYLINE]: {},
      [RECTANGLE]: {},
      [CIRCLE]: {},
      [POLYLINE_MEASURE]: {},
      [CIRCLE_MEASURE]: {},
      [POLYGON]: {},
      [POLYGON_MEASURE]: {},
      [LABEL]: {},
      [STRAIGHT_ARROW]: {},
      [STRAIGHT_ARROW_2]: {},
      [STRAIGHT_ARROW_3]: {},
      [STRAIGHT_ARROW_4]: {},
      [ATTACK_ARROW]: {},
      [ELLIPSE]: {},
    };
    //当前选定实例
    this.seletedInstance = null;

    window.shapeDic = this.shapeDic;

    this.registEvent();
  }

  /**
   * 绘制折线
   */
  drawPolyline(options = {}) {
    let { color } = options;
    let polylineInstance = new GlobePolylineDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[POLYLINE][polylineInstance.id] = polylineInstance;
  }

  /**
   * 绘制计算距离
   * @param {*} options
   */
  drawPolylineMeasure(options = {}) {
    let { color } = options;
    let polylineMeasureInstance = new GlobePolylineMeasure(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[POLYLINE_MEASURE][
      polylineMeasureInstance.id
    ] = polylineMeasureInstance;
  }

  /**
   * 绘制矩形
   * @param {*} options
   */
  drawRectangle(options = {}) {
    let { color } = options;
    let rectangleInstance = new GlobeRectangleDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[RECTANGLE][rectangleInstance.id] = rectangleInstance;
  }

  /**
   * 绘制圆形
   * @param {*} options
   */
  drawCircle(options = {}) {
    let { color } = options;
    let circleInstance = new GlobeCircleDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[CIRCLE][circleInstance.id] = circleInstance;
  }

  /**
   * 计算圆形面积
   * @param {*} options
   */
  drawCircleMeasure(options = {}) {
    let { color } = options;
    let circleMeasureInstance = new GlobeCircleMeasure(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[CIRCLE_MEASURE][
      circleMeasureInstance.id
    ] = circleMeasureInstance;
  }

  /**
   * 绘制多边形
   * @param {*} options
   */
  drawPolygon(options = {}) {
    let { color } = options;
    let polygonInstance = new GlobePolygonDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[POLYGON][polygonInstance.id] = polygonInstance;
  }

  /**
   * 绘制多边形
   * @param {*} options
   */
  drawPolygonMeasure(options = {}) {
    let { color } = options;
    let polygonMeasureInstance = new GlobePolygonMeasure(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[POLYGON_MEASURE][
      polygonMeasureInstance.id
    ] = polygonMeasureInstance;
  }

  /**
   * 绘制文本
   * @param {*} options
   */
  drawLabel(options = {}) {
    let { color } = options;
    let labelInstance = new GlobeLabelDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[LABEL][labelInstance.id] = labelInstance;
  }

  /**
   * 绘制粗直线箭头
   * @param {*} options
   */
  drawStraightArrow(options = {}) {
    let { color } = options;
    let straightArrowInstance = new PlotStraightArrowDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[STRAIGHT_ARROW][
      straightArrowInstance.id
    ] = straightArrowInstance;
  }

  /**
   * 绘制细直线箭头
   * @param {*} options
   */
  drawStraightArrow2(options = {}) {
    let { color } = options;
    let straightArrow2Instance = new PlotStraightArrow2Drawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[STRAIGHT_ARROW_2][
      straightArrow2Instance.id
    ] = straightArrow2Instance;
  }

  /**
   * 绘制细直线箭头
   * @param {*} options
   */
  drawStraightArrow3(options = {}) {
    let { color } = options;
    let straightArrow3Instance = new PlotStraightArrow3Drawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[STRAIGHT_ARROW_3][
      straightArrow3Instance.id
    ] = straightArrow3Instance;
  }

  /**
   * 绘制细直线虚线箭头
   * @param {*} options
   */
  drawStraightArrow4(options = {}) {
    let { color } = options;
    let straightArrow4Instance = new PlotStraightArrow4Drawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[STRAIGHT_ARROW_4][
      straightArrow4Instance.id
    ] = straightArrow4Instance;
  }

  /**
   * 绘制攻击箭头
   * @param {*} options
   */
  drawAttackArrow(options = {}) {
    let { color } = options;
    let attackArrowInstance = new PlotAttackArrowDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[ATTACK_ARROW][attackArrowInstance.id] = attackArrowInstance;
  }

  /**
   * 绘制椭圆
   * @param {*} options
   */
  drawEllipse(options = {}) {
    let { color } = options;
    let ellipseInstance = new GlobeEllipseDrawer(this.viewer, {
      cb: this.cb,
      color: color,
      plot: this,
    });
    this.shapeDic[ELLIPSE][ellipseInstance.id] = ellipseInstance;
  }

  /**
   * 编辑图形
   * @param {*} shape
   * @param {*} instanceId
   */
  editPlot(shape, instanceId) {
    this.shapeDic[shape][instanceId].editPlot();
  }

  /**
   * 删除图形
   * @param {*} shape
   * @param {*} instanceId
   */
  delPlot(shape, instanceId) {
    this.shapeDic[shape][instanceId].delPlot();
  }

  /**
   * 删除选择的实例
   * @param {*} seletedInstance
   */
  delSelectedInstance(seletedInstance) {
    this.delPlot(
      seletedInstance.entity.shape,
      seletedInstance.entity.instanceId
    );
    this.seletedInstance = null;
    ee.emit("panel", null);
  }

  /**
   * 清除绘制图形
   */
  clear() {
    for (let shape in this.shapeDic) {
      for (let instanceId in this.shapeDic[shape]) {
        if (!this.shapeDic[shape][instanceId].isValid) continue;
        this.shapeDic[shape][instanceId].clear();
      }
      this.shapeDic[shape] = {};
    }
  }

  /**
   * 仅当地图实体被remove时，重新绘制
   */
  plotShapes() {
    for (let shape in this.shapeDic) {
      for (let instanceId in this.shapeDic[shape]) {
        if (!this.shapeDic[shape][instanceId].isValid) continue;
        this.shapeDic[shape][instanceId].reDraw();
      }
    }
  }

  /**
   * 获取实例数据，用于上传数据库
   */
  shapeFormat() {
    let data = [];
    for (let shape in this.shapeDic) {
      for (let instanceId in this.shapeDic[shape]) {
        if (!this.shapeDic[shape][instanceId].isValid) continue;
        data.push(this.shapeDic[shape][instanceId].getData());
      }
    }
    return data;
  }

  /**
   * 解析数据，用于从数据库获取数据生成对象
   */
  shapeParse(data = []) {
    data.forEach((val) => {
      this.initInstance(val);
    });
  }

  /**
   * 初始化实例
   * @param {*} data
   */
  initInstance(data) {
    switch (data.shape) {
      case POLYLINE:
        let polylineInstance = new GlobePolylineDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[POLYLINE][polylineInstance.id] = polylineInstance;
        break;
      case RECTANGLE:
        let rectangleInstance = new GlobeRectangleDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[RECTANGLE][rectangleInstance.id] = rectangleInstance;
        break;
      case CIRCLE:
        let circleInstance = new GlobeCircleDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[CIRCLE][circleInstance.id] = circleInstance;
        break;
      case POLYLINE_MEASURE:
        let polylineMeasureInstance = new GlobePolylineMeasure(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[POLYLINE_MEASURE][
          polylineMeasureInstance.id
        ] = polylineMeasureInstance;
        break;
      case CIRCLE_MEASURE:
        let circleMeasureInstance = new GlobeCircleMeasure(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[CIRCLE_MEASURE][
          circleMeasureInstance.id
        ] = circleMeasureInstance;
        break;
      case POLYGON:
        let polygonInstance = new GlobePolygonDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[POLYGON][polygonInstance.id] = polygonInstance;
        break;
      case POLYGON_MEASURE:
        let polygonMeasureInstance = new GlobePolygonMeasure(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[POLYGON_MEASURE][
          polygonMeasureInstance.id
        ] = polygonMeasureInstance;
        break;
      case LABEL:
        let labelInstance = new GlobeLabelDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[LABEL][labelInstance.id] = labelInstance;
        break;
      case STRAIGHT_ARROW:
        let straightArrowInstance = new PlotStraightArrowDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[STRAIGHT_ARROW][
          straightArrowInstance.id
        ] = straightArrowInstance;
        break;
      case STRAIGHT_ARROW_2:
        let straightArrow2Instance = new PlotStraightArrow2Drawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[STRAIGHT_ARROW_2][
          straightArrow2Instance.id
        ] = straightArrow2Instance;
        break;
      case STRAIGHT_ARROW_3:
        let straightArrow3Instance = new PlotStraightArrow3Drawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[STRAIGHT_ARROW_3][
          straightArrow3Instance.id
        ] = straightArrow3Instance;
        break;
      case STRAIGHT_ARROW_4:
        let straightArrow4Instance = new PlotStraightArrow4Drawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[STRAIGHT_ARROW_4][
          straightArrow4Instance.id
        ] = straightArrow4Instance;
        break;
      case ATTACK_ARROW:
        let attackArrowInstance = new PlotAttackArrowDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[ATTACK_ARROW][
          attackArrowInstance.id
        ] = attackArrowInstance;
        break;
      case ELLIPSE:
        let ellipseInstance = new GlobeEllipseDrawer(
          this.viewer,
          { cb: this.cb, plot: this },
          data
        );
        this.shapeDic[ELLIPSE][ellipseInstance.id] = ellipseInstance;
        break;
    }
  }

  /**
   * 编辑事件
   */
  registEvent() {
    let _this = this;
    let drawHandler = new Cesium.ScreenSpaceEventHandler(this.canvas);

    drawHandler.setInputAction((event) => {
      var pick = this.viewer.scene.pick(event.position);

      if (!pick) {
        if (_this.seletedInstance) {
          _this.seletedInstance.save();
          _this.seletedInstance = null;
          ee.emit("panel", null);
        }
        return;
      }

      let entity = pick.id;
      if (!entity || entity.layerId !== GLOBE_PLOT_LAYER) {
        if (_this.seletedInstance) {
          _this.seletedInstance.save();
          _this.seletedInstance = null;
          ee.emit("panel", null);
        }
        return;
      }

      if (_this.seletedInstance) {
        if (_this.seletedInstance.entity.instanceId === entity.instanceId) {
          return;
        } else {
          _this.seletedInstance.save();
          _this.seletedInstance = null;
        }
      }

      //编辑事件
      _this.editPlot(entity.shape, entity.instanceId);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
  }
}

export default Plot;
