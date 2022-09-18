import { createRouter, createWebHashHistory } from 'vue-router';
import Levels from './pages/levels.vue';
import Level from './pages/level.vue';
import About from './pages/about.vue';

const routes = [
  { path: '/level', component: Level }, 
  { path: '/', component: Levels }, 
  { path: '/about', component: About }, 
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
