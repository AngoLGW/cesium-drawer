import circle_gray_img from "../images/circle_gray.png";
import * as Cesium from "cesium";

import { MID_POINT } from "../config/constant";

class MidPoint {
  constructor(viewer, cartesian) {
    this.point = viewer.entities.add({
      layerId: MID_POINT,
      flag: "mid_anchor",
      position: cartesian,
      billboard: {
        image: circle_gray_img,
        eyeOffset: new Cesium.ConstantProperty(
          new Cesium.Cartesian3(0, 0, -500)
        ),
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
      },
    });
  }
}

export default MidPoint;
