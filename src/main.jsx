import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

// 添加全局 crypto polyfill
if (typeof window !== 'undefined' && !window.crypto) {
  window.crypto = {
    getRandomValues: function(buffer) {
      for (let i = 0; i < buffer.length; i++) {
        buffer[i] = Math.floor(Math.random() * 256);
      }
      return buffer;
    }
  };
}

// 确保DOM元素存在后再渲染应用
document.addEventListener('DOMContentLoaded', () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
      <App />
    );
  } else {
    console.error("Root element not found");
  }
});
