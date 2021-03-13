/**
 * 颜色池
 */
const colorPool = ["#02B3FC", "#FCB902", "#FC0202", "#02FC3C", "#fff"];

/**
 * 默认填充色
 */
const defaultFillColor = "rgba(255, 126, 126, 0.43)";

/**
 * 默认边框颜色
 */
const defaultEdgeColor = "rgba(247, 255, 3, 1)";

/**
 * 默认线条颜色
 */
const defaultLineColor = "#02B3FC";

/**
 * 默认文字颜色
 */
const defaultTextColor = "rgba(255, 255, 255, 1)";

/**
 * 默认文字背景色
 */
const defaultBGColor = "rgba(0, 0, 0, 0.5)";
class Color {
  constructor({ lineColor, fillColor, edgeColor, textColor, bgColor }) {
    this.lineColor = lineColor ? lineColor : defaultLineColor;
    this.fillColor = fillColor ? fillColor : defaultFillColor;
    this.edgeColor = edgeColor ? edgeColor : defaultEdgeColor;
    this.textColor = textColor ? textColor : defaultTextColor;
    this.bgColor = bgColor ? bgColor : defaultBGColor;
  }
  setLineColor(lineColor) {
    this.lineColor = lineColor;
  }
  setFillColor(fillColor) {
    this.fillColor = fillColor;
  }
  setEdgeColor(edgeColor) {
    this.edgeColor = edgeColor;
  }
  setTextColor(textColor) {
    this.textColor = textColor;
  }
  setBGColor(bgColor) {
    this.bgColor = bgColor;
  }
}

export {
  colorPool,
  defaultFillColor,
  defaultEdgeColor,
  defaultLineColor,
  defaultTextColor,
  defaultBGColor,
};

export default Color;
