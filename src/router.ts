import { createRouter, createWebHashHistory } from 'vue-router';
import Designer from './pages/designer.vue';
import Levels from './pages/levels.vue';
import Level from './pages/level.vue';
import About from './pages/about.vue';

const routes = [
  { path: '/', component: Level }, 
  { path: '/designer', component: Designer }, 
  { path: '/levels', component: Levels }, 
  { path: '/about', component: About }, 
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
