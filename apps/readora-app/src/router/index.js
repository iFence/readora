import {createWebHistory, createRouter} from 'vue-router';
// 公共路由
export const constantRoutes = [
    {
        path: "/",
        component: () => import("@/views/Home.vue")
    },
    {
        path: '/home',
        component: () => import("@/views/Home.vue"),
        name: 'Home',
    },
    {
        path: '/settings',
        component: () => import("@/views/Settings/index.vue"),
        name: 'Settings',
        children: [
            {
                path: '/General',
                name: 'general',
                component: () => import("@/views/Settings/components/General.vue")
            },
        ]
    },
    {
        path: '/bookshelf',
        component: () => import("@/views/Bookshelf.vue"),
        name: 'Bookshelf'
    },
    {
        path: '/reader',
        component: () => import("@/views/EpubViewer.vue"),
        name: 'reader',
        props: (route) =>({
            bookUrl: route.query.bookUrl,
            sourcePath: route.query.sourcePath || '',
            location: route.query.location || '',
            sectionIndex: route.query.sectionIndex ? Number(route.query.sectionIndex) : null,
        }),
    },
    {
        path: '/note',
        component: () => import("@/views/Note.vue"),
        name: 'Note',
    },
    {
        path: '/analysis',
        component: () => import("@/views/Analysis.vue"),
        name: 'Analysis',
    },
    {
        path: '/:pathMatch(.*)*',
        component: () => import("@/views/NotFound.vue"),
        name: 'NotFound',
    },
];

const router = createRouter({
    history: createWebHistory(),
    routes: constantRoutes,
})

export default router
