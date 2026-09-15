module.exports = {
  plugins: {
    // 将 src/index.css 和组件样式中的 Tailwind 指令编译成最终 CSS。
    tailwindcss: {},
    // 在 Tailwind 处理完成后，根据目标浏览器补齐厂商前缀。
    autoprefixer: {},
  },
}
