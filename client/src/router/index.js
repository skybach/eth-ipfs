import Vue from 'vue'
import Router from 'vue-router'
import Home from '@/components/Home'
import VueSession from 'vue-session'

Vue.use(VueSession)
Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    }
  ]
})
