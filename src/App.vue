<template>
  <div id="app">
    <div id="cesium"></div>
    <PlotInfoPanel />
    <PlotToolPanel />
  </div>
</template>

<script>
import * as Cesium from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import PlotInfoPanel from "./components/PlotInfoPanel";
import PlotToolPanel from "./components/PlotToolPanel";
import Plot from "./lib/Plot/index";
import "./lib/Plot/css/index.css";

let plot = null;
let viewer = null;

export default {
  name: "App",
  components: {
    PlotInfoPanel,
    PlotToolPanel,
  },
  provide: {
    plot: () => {
      return plot;
    },
  },
  data() {
    return {};
  },
  mounted() {
    viewer = new Cesium.Viewer("cesium", {
      animation: false,
      timeline: false,
      navigationHelpButton: false,
      scene3DOnly: true,
      fullscreenButton: false,
      geocoder: false,
      homeButton: false,
      baseLayerPicker: false,
      infoBox: false,
    });
    plot = new Plot(viewer);
  },
};
</script>
<style>
* {
  margin: 0;
  padding: 0;
}
#cesium {
  width: 100%;
  height: 100vh;
}
</style>
