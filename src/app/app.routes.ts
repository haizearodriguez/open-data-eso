import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'pruebas',
    loadComponent: () => import('./pages/pruebas/pruebas.page').then( m => m.PruebasPage)
  },
  {
    path: 'onboarding',
    loadComponent: () => import('./pages/onboarding/onboarding.page').then( m => m.OnboardingPage)
  },
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then( m => m.HomePage)
  },
  {
    path: 'lectura',
    loadComponent: () => import('./pages/lectura/lectura.page').then( m => m.LecturaPage)
  },
  {
    path: 'matematicas',
    loadComponent: () => import('./pages/ejercicio-generado/ejercicio-generado.page').then( m => m.EjercicioGeneradoPage),
    data: { materia: 'matematicas', titulo: 'Matemáticas' },
  },
  {
    path: 'ciencias',
    loadComponent: () => import('./pages/ejercicio-generado/ejercicio-generado.page').then( m => m.EjercicioGeneradoPage),
    data: { materia: 'ciencias', titulo: 'Ciencias' },
  },
  {
    // A propósito sin enlace desde la navegación de alumnado (home,
    // onboarding...) -- es para personal de centro/Educación, con su
    // propio login (Supabase Auth), y accede escribiendo esta URL
    // directamente o a través de un enlace que se les da aparte.
    path: 'panel-centro',
    loadComponent: () => import('./pages/panel-centro/panel-centro.page').then( m => m.PanelCentroPage)
  },

];