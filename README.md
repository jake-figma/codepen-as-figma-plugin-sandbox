# CodePen as Figma plugin sandbox

This is a demo of how you can use a CodePen embed as a Figma plugin sandbox.

This functionality currently requires two pens.

- The first is a pen that is the embedded editor for the sandbox. It contains some boilerplate code.
  - In this demo, that pen is [codepen.io/jak_e/pen/dyBmqPm/624e81d0cdc8605f9724c2cbac560754](https://codepen.io/jak_e/pen/dyBmqPm/624e81d0cdc8605f9724c2cbac560754)
- The second pen wraps the first pen and acts as a relay for messages between Figma and the embed.
  - In this demo, that pen is [codepen.io/jak_e/pen/mdZLdYK/03be78f4c40483a83e8d2b8daf371084](https://codepen.io/jak_e/pen/mdZLdYK/03be78f4c40483a83e8d2b8daf371084)
  - Its debug url is referenced in [code.js](./code.js)

You can use this plugin as is with those two pens, but in order to change the starter code, you'll need a CodePen pro account to access debug view on your own version of the second pen.

[Learn more about developing Figma plugins](https://www.figma.com/plugin-docs/).

## Advanced demo

If you want to see a more advanced demo of functionality, you can replace the embed default values while running the plugin with the following HTML and JS in the CodePen editor.

```html
<canvas></canvas>
```

```js
console.clear();

const canvas = document.querySelector("canvas");
const context = canvas.getContext("2d");
const EASING = 0.1;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const images = {};
const users = {};
const usersRendered = {};
let currentSessionId;

loop();

function loop() {
  requestAnimationFrame(loop);

  context.clearRect(0, 0, canvas.width, canvas.height);

  const currentSession = users[currentSessionId];
  if (!currentSession) return;

  const { viewport, position } = currentSession;
  const scale = 1 - Math.max(0.1, Math.min(0.9, viewport.height / 20000));
  canvas.height = viewport.height * scale;
  canvas.width = viewport.width * scale;
  for (let sessionId in users) {
    const image = images[sessionId];
    const user = users[sessionId];
    if (image) {
      const position = easeVector(
        usersRendered[sessionId].position,
        users[sessionId].position,
        EASING
      );
      usersRendered[sessionId].position = position;
      const color = users[sessionId].color;
      const selectionCount = users[sessionId].selection.length;
      const { x, y } = position;
      const imageWidth = 300 * scale + 10;
      const imageHeight =
        (image.naturalHeight / image.naturalWidth) * imageWidth;
      const imageX = (x - viewport.x) * scale - imageWidth / 2;
      const imageY = (y - viewport.y) * scale - imageHeight / 2;
      context.fillStyle = color;
      context.strokeStyle = color;
      context.lineWidth = Math.round(30 * scale + 1);
      context.drawImage(image, imageX, imageY, imageWidth, imageHeight);
      context.font = `${imageHeight * 0.6}px Helvetica`;
      context.textBaseline = "middle";
      context.textAlign = "center";
      context.fillText(
        selectionCount,
        imageX + imageWidth / 2,
        imageY + imageHeight / 2
      );
      context.strokeRect(imageX, imageY, imageWidth, imageHeight);
    }
  }
}

function easeVector(current, target, t) {
  if (!current) current = target;
  t = Math.max(0, Math.min(1, t));
  const x = current.x + (target.x - current.x) * t;
  const y = current.y + (target.y - current.y) * t;
  return { x, y };
}

// Receiving messages from Figma and doing stuff in the UI
function onMessageFromFigmaPlugin(message) {
  if (message && message.type === "USERS") {
    const { data } = message;
    currentSessionId = data.currentSessionId;
    data.users.forEach((user) => {
      users[user.sessionId] = user;

      if (!usersRendered[user.sessionId]) {
        usersRendered[user.sessionId] = user;
      }
      if (!images[user.sessionId]) {
        const image = new Image();
        image.src = user.photoUrl;
        image.onload = () => (images[user.sessionId] = image);
      }
    });
    setTimeout(() => {
      postMessage({ type: "MESSAGE_RECEIVED" });
    }, 20);
  }
}

// The code we want to run inside of the Figma sandbox.
function figmaPlugin() {
  // Important: This wipes out everything on the current page which is destructive but can be undone.
  figma.currentPage.children.forEach((child) => child.remove());

  sendMessage();

  // Figma receiving message events from the Plugin UI
  figma.ui.onmessage = (message) => {
    // We can run Figma code here as a response to UI actions
    if (message.type === "MESSAGE_RECEIVED") {
      sendMessage();
    }
  };

  function sendMessage() {
    figma.ui.postMessage({
      type: "USERS",
      data: {
        users: figma.activeUsers,
        currentSessionId: figma.currentUser.sessionId,
      },
    });
  }
}

/**
 * Functional stuff to get the above to work
 */

// The parent iframe will write messages from Figma to localStorage since it cannot post messages
//   into this iframe (CSP limitation).
// We poll localStorage and pass any data we find to the onMessageFromFigmaPlugin callback before resetting.
setInterval(() => {
  const data = localStorage.getItem("plugin-data");
  if (data) {
    onMessageFromFigmaPlugin(JSON.parse(data));
    localStorage.removeItem("plugin-data");
  }
}, 50);

// Sending the figmaPlugin code up to the Figma plugin to execute as IIFE
postMessage({ type: "PLUGIN_API_CODE", code: `(${figmaPlugin})()` });

function postMessage(pluginMessage) {
  // Assuming we are running inside an embed, we need to bubble up two levels.
  // the first is the embed result preview iframe, then next is the embed iframe.
  window.parent.parent.postMessage({ pluginMessage, pluginId: "*" }, "*");
  // This will send the message all the way up to each level.
  // let parent = window;
  // while (parent) {
  //   if (parent.parent === parent) break;
  //   parent = parent.parent;
  //   parent.postMessage({ pluginMessage, pluginId: "*" }, "*");
  // }
}
```
