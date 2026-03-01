tabId = crypto.randomUUID();
color = '#' + Math.random().toString(16).substr(-6);

function init() {
    localStorage.clear();
}

function draw_circle(context, x, y, r, color) {
    context.beginPath();
    context.arc(x, y, r, 0, 2 * Math.PI, false);
    context.fillStyle = color;
    context.strokeStyle = color;
    // context.fill();
    context.stroke();
}

function draw_line(context, x, y, x1, y1, color) {
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x1, y1);
    context.strokeStyle = color;
    context.stroke();
}

function draw_tangents(context, x1, y1, r1, x2, y2, r2, lineColor) {
    var d = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
    var theta1 = Math.atan2(y2 - y1, x2 - x1);
    var theta2 = Math.acos((r1 - r2) / d);

    // calculate outer tangents
    var xt1 = x1 + r1 * Math.cos(theta1 + theta2);
    var yt1 = y1 + r1 * Math.sin(theta1 + theta2);
    var xt2 = x2 + r2 * Math.cos(theta1 + theta2);
    var yt2 = y2 + r2 * Math.sin(theta1 + theta2);

    var xt3 = x1 + r1 * Math.cos(theta1 - theta2);
    var yt3 = y1 + r1 * Math.sin(theta1 - theta2);
    var xt4 = x2 + r2 * Math.cos(theta1 - theta2);
    var yt4 = y2 + r2 * Math.sin(theta1 - theta2);

    draw_line(context, xt1, yt1, xt2, yt2, lineColor);
    draw_line(context, xt3, yt3, xt4, yt4, lineColor);
}


function draw_inner_connections(context, x1, y1, x2, y2, r1, r2, color1, color2, lineColor) {
    draw_circle(context, x1, y1, r1 / 3, color2);
    draw_circle(context, x2, y2, r2 / 3, color1);
    draw_tangents(context, x1, y1, r1, x2, y2, r2 / 3, color1);
    draw_tangents(context, x1, y1, r1 / 3, x2, y2, r2, color2);

}

function update_local_storage(canvas, context, x, y, r) {
    data = {
        "x": x, "y": y, "r": r, "color": color,
        "x0": window.screenX, "y0": window.screenY,
        "xn": window.innerWidth, "yn": window.innerHeight
    };
    localStorage.setItem("entangled-" + tabId, JSON.stringify(data));
    console.log("Saved:: " + JSON.stringify(data));
}

function draw_connections(canvas, context, x, y, r) {
    var centers = [[x, y, r, color]]
    lineColor = 'red';
    for (var i = 0; i < localStorage.length; i++) {
        var key = localStorage.key(i);
        if (key.startsWith("entangled-") && key != "entangled-" + tabId) {
            var data = JSON.parse(localStorage.getItem(key));
            var x1 = data["x"] + data["x0"] - window.screenX;
            var y1 = data["y"] + data["y0"] - window.screenY;
            centers.push([x1, y1, data["r"], data["color"]]);
        }
    }
    for (var i = 0; i < centers.length; i++) {
      for (var j = i + 1; j < centers.length; j++) {
        draw_inner_connections(
            context,
            centers[i][0], centers[i][1],
            centers[j][0], centers[j][1],
            centers[i][2], centers[j][2],
            centers[i][3], centers[j][3],
            lineColor
        );
      }
      draw_circle(context, centers[i][0], centers[i][1], centers[i][2], centers[i][3]);
    }
}

function repeat() {
    var x = window.innerWidth / 2;
    var y = window.innerHeight / 2;
    var r = window.innerWidth / 8;
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    update_local_storage(canvas, context, x, y, r);
    draw_connections(canvas, context, x, y, r);
    draw_circle(context, x, y, r, color);
}

var intervalId = window.setInterval(function(){
    repeat()
}, 100);
