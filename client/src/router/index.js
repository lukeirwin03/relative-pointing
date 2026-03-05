import { createRouter, createWebHistory } from 'vue-router';
import SessionCreator from '../components/SessionCreator.vue';
import TaskBoard from '../components/TaskBoard.vue';
import SessionReport from '../components/SessionReport.vue';

const routes = [
  {
    path: '/',
    name: 'home',
    component: SessionCreator,
  },
  {
    path: '/session/:roomCode',
    name: 'session',
    component: TaskBoard,
    beforeEnter: (to, from, next) => {
      const userId = localStorage.getItem('userId');
      const userName = localStorage.getItem('userName');
      if (!userId || !userName) {
        next({ path: '/', query: { join: to.params.roomCode } });
      } else {
        next();
      }
    },
  },
  {
    path: '/session/:roomCode/report',
    name: 'report',
    component: SessionReport,
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
