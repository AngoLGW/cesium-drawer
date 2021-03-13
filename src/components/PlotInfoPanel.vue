<template>
  <div class="map-info-panel" :class="{ 'is-active': drawerVisible }">
    <div class="slot-title">
      <span>属性编辑</span>
    </div>
    <div class="slot-body">
      <div class="item" v-if="[shapeMap.LABEL].includes(shape)">
        <div class="item-title">内容</div>
        <div class="item-body">
          <el-input
            type="textarea"
            v-model="text"
            style="margin-top:8px"
          ></el-input>
        </div>
      </div>
      <div class="item">
        <div class="item-title">外观</div>
        <div
          v-if="
            [
              shapeMap.POLYLINE,
              shapeMap.POLYLINE_MEASURE,
              shapeMap.STRAIGHT_ARROW_3,
              shapeMap.STRAIGHT_ARROW_4,
            ].includes(shape)
          "
        >
          <div
            class="sub-item"
            v-if="[shapeMap.POLYLINE_MEASURE].includes(shape)"
          >
            <div class="sub-item-title">字体颜色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="textColor"
                @active-change="textActiveChange"
              ></el-color-picker>
            </div>
          </div>
          <div class="sub-item">
            <div class="sub-item-title">线条颜色</div>
            <div class="sub-item-body">
              <!-- <WXPick v-model="fillColor" /> -->
              <el-color-picker
                show-alpha
                v-model="lineColor"
                @active-change="lineActiveChange"
              ></el-color-picker>
            </div>
          </div>
        </div>
        <div
          v-if="
            [
              shapeMap.POLYGON,
              shapeMap.POLYGON_MEASURE,
              shapeMap.RECTANGLE,
              shapeMap.CIRCLE,
              shapeMap.CIRCLE_MEASURE,
              shapeMap.ATTACK_ARROW,
            ].includes(shape)
          "
        >
          <div
            class="sub-item"
            v-if="
              [shapeMap.POLYGON_MEASURE, shapeMap.CIRCLE_MEASURE].includes(
                shape
              )
            "
          >
            <div class="sub-item-title">字体颜色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="textColor"
                @active-change="textActiveChange"
              ></el-color-picker>
            </div>
          </div>
          <div class="sub-item">
            <div class="sub-item-title">填充色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="fillColor"
                @active-change="fillActiveChange"
              ></el-color-picker>
            </div>
          </div>
          <div class="sub-item">
            <div class="sub-item-title">边界</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="edgeColor"
                @active-change="edgeActiveChange"
              ></el-color-picker>
            </div>
          </div>
        </div>
        <div v-if="[shapeMap.LABEL].includes(shape)">
          <div class="sub-item">
            <div class="sub-item-title">字体颜色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="textColor"
                @active-change="textActiveChange"
              ></el-color-picker>
            </div>
          </div>
          <div class="sub-item">
            <div class="sub-item-title">背景颜色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="bgColor"
                @active-change="bgActiveChange"
              ></el-color-picker>
            </div>
          </div>
        </div>
        <div v-if="[shapeMap.ELLIPSE].includes(shape)">
          <div class="sub-item">
            <div class="sub-item-title">填充色</div>
            <div class="sub-item-body">
              <el-color-picker
                show-alpha
                v-model="fillColor"
                @active-change="fillActiveChange"
              ></el-color-picker>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="slot-footer">
      <el-button type="primary" icon="el-icon-delete" @click="del"
        >删除</el-button
      >
    </div>
  </div>
</template>

<script>
import {
  defaultLineColor,
  defaultFillColor,
  defaultEdgeColor,
  defaultTextColor,
  defaultBGColor,
} from "../lib/Plot/class/Color";
import {
  POLYLINE,
  POLYLINE_MEASURE,
  RECTANGLE,
  CIRCLE,
  CIRCLE_MEASURE,
  POLYGON,
  POLYGON_MEASURE,
  LABEL,
  STRAIGHT_ARROW_3,
  STRAIGHT_ARROW_4,
  ATTACK_ARROW,
  ELLIPSE,
} from "../lib/Plot/config/constant";
import ee from "../utils/eventEmitter";

export default {
  name: "MapInfoPanel",
  inject: ["plot"],
  props: {},
  data() {
    return {
      drawerVisible: true,
      text: "",
      textColor: defaultTextColor,
      bgColor: defaultBGColor,
      lineColor: defaultLineColor,
      fillColor: defaultFillColor,
      edgeColor: defaultEdgeColor,
      shape: "",
      shapeMap: {
        POLYLINE,
        POLYLINE_MEASURE,
        RECTANGLE,
        CIRCLE,
        CIRCLE_MEASURE,
        POLYGON,
        POLYGON_MEASURE,
        LABEL,
        STRAIGHT_ARROW_3,
        STRAIGHT_ARROW_4,
        ATTACK_ARROW,
        ELLIPSE,
      },
    };
  },
  mounted() {
    ee.on("panel", this.toggleDrawer);
  },
  watch: {
    text: function(val) {
      let plot = this.plot();
      if (plot.seletedInstance) plot.seletedInstance.setText(val);
    },
  },
  methods: {
    textActiveChange(val) {
      let plot = this.plot();
      this.textColor = val;
      plot.seletedInstance.setColor({ textColor: this.textColor });
    },
    lineActiveChange(val) {
      let plot = this.plot();
      this.lineColor = val;
      plot.seletedInstance.setColor({ lineColor: this.lineColor });
    },
    fillActiveChange(val) {
      let plot = this.plot();
      this.fillColor = val;
      plot.seletedInstance.setColor({ fillColor: this.fillColor });
    },
    edgeActiveChange(val) {
      let plot = this.plot();
      this.edgeColor = val;
      plot.seletedInstance.setColor({ edgeColor: this.edgeColor });
    },
    bgActiveChange(val) {
      let plot = this.plot();
      this.bgColor = val;
      plot.seletedInstance.setColor({ bgColor: this.bgColor });
    },
    toggleDrawer(val) {
      if (val) {
        this.drawerVisible = true;
        this.shape = val.entity.shape;
        if (
          [
            this.shapeMap.POLYLINE,
            this.shapeMap.POLYLINE_MEASURE,
            this.shapeMap.STRAIGHT_ARROW_3,
            this.shapeMap.STRAIGHT_ARROW_4,
          ].includes(this.shape)
        ) {
          if ([this.shapeMap.POLYLINE_MEASURE].includes(this.shape)) {
            this.textColor = val.color.textColor;
          }
          this.lineColor = val.color.lineColor;
        }

        if (
          [
            this.shapeMap.POLYGON,
            this.shapeMap.POLYGON_MEASURE,
            this.shapeMap.RECTANGLE,
            this.shapeMap.CIRCLE,
            this.shapeMap.CIRCLE_MEASURE,
            this.shapeMap.ELLIPSE,
            this.shapeMap.ATTACK_ARROW,
          ].includes(this.shape)
        ) {
          if (
            [
              this.shapeMap.POLYGON_MEASURE,
              this.shapeMap.CIRCLE_MEASURE,
            ].includes(this.shape)
          ) {
            this.textColor = val.color.textColor;
          }
          this.fillColor = val.color.fillColor;
          this.edgeColor = val.color.edgeColor;
        }
        if ([this.shapeMap.LABEL].includes(this.shape)) {
          this.text = val.label;
          this.textColor = val.color.textColor;
          this.bgColor = val.color.bgColor;
        }
        if ([this.shapeMap.ELLIPSE].includes(this.shape)) {
          this.fillColor = val.color.fillColor;
        }
      } else {
        this.drawerVisible = false;
      }
    },
    closed() {
      this.text = "";
      this.textColor = defaultTextColor;
      this.lineColor = defaultLineColor;
      this.fillColor = defaultFillColor;
      this.edgeColor = defaultEdgeColor;
      this.shape = "";
    },
    async del() {
      await this.$confirm("确定删除?", "温馨提示");
      let plot = this.plot();
      plot.delSelectedInstance(plot.seletedInstance);
    },
  },
};
</script>

<style lang="scss" scoped>
.map-info-panel {
  width: 280px;
  height: calc(100vh - 100px);
  position: fixed;
  top: 50px;
  right: -280px;
  transition: right 0.3s;
  background-color: #2b2b2b;

  &.is-active {
    right: 0;
  }

  .slot-title {
    height: 52px;
    background-color: #505050;
    color: #fafafa;
    display: flex;
    justify-content: space-between;
    padding: 0 14px;
    align-items: center;
    span {
      font-family: Source Han Sans SC;
      font-size: 16px;
    }
  }
  .slot-body {
    padding: 0 14px;
    height: 60%;
    border-bottom: 1px solid #666666;
    .item {
      margin: 10px 0;
      .item-title {
        font-size: 14px;
        font-family: Source Han Sans CN;
        font-weight: 400;
        line-height: 24px;
        color: #fafafa;
        opacity: 1;
      }
      .sub-item {
        margin: 5px;
        .sub-item-title {
          font-size: 12px;
          font-family: Source Han Sans CN;
          font-weight: 400;
          line-height: 20px;
          color: #fafafa;
          opacity: 0.6;
        }
        .sub-item-body {
          margin: 5px 0;
        }
      }
    }
  }
  .slot-footer {
    display: flex;
    flex-direction: row-reverse;
    padding: 10px;
  }
}
</style>
