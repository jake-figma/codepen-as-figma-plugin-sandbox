console.clear();

figma.showUI(
  `<script>location.href = "https://codepen.io/jak_e/debug/mdZLdYK/03be78f4c40483a83e8d2b8daf371084";</script>`,
  {
    height: 400,
    width: 1300,
  }
);

figma.ui.on("message", (message) => {
  if (message && message.type === "PLUGIN_API_CODE") {
    eval(message.code);
  }
});
