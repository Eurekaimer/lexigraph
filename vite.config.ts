import{defineConfig}from'vite';import{VitePWA}from'vite-plugin-pwa';
export default defineConfig({base:'/lexigraph/',plugins:[VitePWA({registerType:'autoUpdate',manifest:{name:'Lexigraph',short_name:'Lexigraph',theme_color:'#f5f1e8',background_color:'#f5f1e8',display:'standalone',start_url:'/lexigraph/'}})]});
