<template>
  <div class="plot-panel">
    <div class="left">
      <div class="item" @click="drawShapes('polylineMeasure')">
        <div class="text">测距离</div>
      </div>
      <div class="item" @click="drawShapes('polygonMeasure')">
        <div class="text">测多边形面积</div>
      </div>
      <div class="item" @click="drawShapes('circleMeasure')">
        <div class="text">测圆形面积</div>
      </div>
    </div>
    <div class="right">
      <div class="item" @click="drawShapes('polyline')">
        <div class="text">折线</div>
      </div>
      <div class="item" @click="drawShapes('rectangle')">
        <div class="text">矩形</div>
      </div>
      <div class="item" @click="drawShapes('polygon')">
        <div class="text">多边形</div>
      </div>
      <div class="item" @click="drawShapes('circle')">
        <div class="text">圆形</div>
      </div>
      <div class="item" @click="drawShapes('ellipse')">
        <div class="text">椭圆</div>
      </div>
      <div class="item" @click="drawShapes('label')">
        <div class="text">文本</div>
      </div>
      <div class="item" @click="drawShapes('straightArrow3')">
        <div class="text">直线箭头</div>
      </div>
      <div class="item" @click="drawShapes('straightArrow4')">
        <div class="text">虚线箭头</div>
      </div>
      <div class="item" @click="drawShapes('attackArrow')">
        <div class="text">攻击箭头</div>
      </div>
    </div>
  </div>
</template>
<script>
export default {
  inject: ["plot"],

  data() {
    return {};
  },
  methods: {
    drawShapes(type) {
      let plot = this.plot();
      switch (type) {
        case "polyline":
          plot.drawPolyline();
          break;
        case "polylineMeasure":
          plot.drawPolylineMeasure();
          break;
        case "polygon":
          plot.drawPolygon();
          break;
        case "polygonMeasure":
          plot.drawPolygonMeasure();
          break;
        case "circle":
          plot.drawCircle();
          break;
        case "circleMeasure":
          plot.drawCircleMeasure();
          break;
        case "ellipse":
          plot.drawEllipse();
          break;
        case "rectangle":
          plot.drawRectangle();
          break;
        case "straightArrow":
          plot.drawStraightArrow();
          break;
        case "straightArrow3":
          plot.drawStraightArrow3();
          break;
        case "straightArrow4":
          plot.drawStraightArrow4();
          break;
        case "attackArrow":
          plot.drawAttackArrow();
          break;
        case "label":
          plot.drawLabel();
          break;
      }
    },
  },
};
</script>
<style lang="scss" scoped>
.plot-panel {
  position: absolute;
  left: 20px;
  top: 20px;
  display: flex;
  padding: 10px;
  border-radius: 4px;
  background-color: #414141;
  color: #bfbfbf;
  text-align: center;
  & > .left {
    display: flex;
    border-right: 1px solid #5d5d5d;
    .item {
      margin: 0 10px;
      cursor: pointer;
      &:hover {
        color: #fff;
      }
    }
  }
  & > .right {
    display: flex;
    .item {
      margin: 0 10px;
      cursor: pointer;
      &:hover {
        color: #fff;
      }
    }
  }
}
</style>
