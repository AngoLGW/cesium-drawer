let _instance = null;

class GlobeTooltip {
  constructor(frameDiv) {
    //单例
    if (_instance) return _instance;

    let div = document.createElement("DIV");
    div.className = "twipsy right";

    let arrow = document.createElement("DIV");
    arrow.className = "twipsy-arrow";
    div.appendChild(arrow);

    let title = document.createElement("DIV");
    title.className = "twipsy-inner";
    div.appendChild(title);

    frameDiv.appendChild(div);

    this.div = div;
    this.title = title;
    this.frameDiv = frameDiv;

    _instance = this;
  }
  setVisible(visible) {
    this.div.style.display = visible ? "block" : "none";
  }
  showAt(position, message) {
    if (position && message) {
      this.setVisible(true);
      this.title.innerHTML = message;
      this.div.style.left = position.x + 10 + "px";
      this.div.style.top = position.y - this.div.clientHeight / 2 + "px";
    }
  }
}

export default GlobeTooltip;
