import circle_red_img from "../images/circle_red.png";
import * as Cesium from "cesium";

import { POINT } from "../config/constant";

class Point {
  constructor(viewer, cartesian) {
    this.point = viewer.entities.add({
      layerId: POINT,
      flag: "anchor",
      position: cartesian,
      billboard: {
        image: circle_red_img,
        eyeOffset: new Cesium.ConstantProperty(new Cesium.Cartesian3(0, 0, 0)),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

export default Point;
