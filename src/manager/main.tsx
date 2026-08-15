import { createRoot } from 'react-dom/client';
import App from './App';
import './styles.css';

// #root 在 index.html 里是静态存在的，拿不到属于不该发生的情况；
// 静默 return 会让扩展白屏且无任何线索，抛错更利于定位
const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('#root 未找到：index.html 结构异常，管理页无法挂载');
createRoot(rootEl).render(<App />);
