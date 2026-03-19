import type { DashboardData } from "./dashboard.types";

export const superAdminMockData: DashboardData = {
  kpis: [
    { id: "1", label: "Pacientes Registrados", value: 12450, trend: 12.5, iconType: "users", color: "#2A9D8F" },
    { id: "2", label: "Clínicas Activas", value: 48, trend: 4.2, iconType: "building", color: "#E76F51" },
    { id: "3", label: "Profesionales", value: 342, trend: 8.1, iconType: "medical", color: "#457B9D" },
    { id: "4", label: "Sesiones Mensuales", value: "45K+", trend: 15.3, iconType: "activity", color: "#F4A261" },
  ],
  growthChart: {
    categories: ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"],
    series: [
      { name: "Nuevos Pacientes", data: [450, 480, 520, 590, 610, 680, 720, 780, 810, 890, 950, 1020], color: "#2A9D8F" },
      { name: "Altas Médicas", data: [120, 135, 125, 150, 160, 140, 180, 190, 210, 205, 230, 250], color: "#E76F51" }
    ]
  },
  distributionChart: [
    { name: "TEA Nivel 1", y: 45, color: "#2A9D8F" },
    { name: "TEA Nivel 2", y: 35, color: "#E9C46A" },
    { name: "TEA Nivel 3", y: 15, color: "#F4A261" },
    { name: "Otros Diagnósticos", y: 5, color: "#E76F51" }
  ],
  recentActivity: [
    { id: "a1", title: "Nueva clínica registrada", description: "Clínica NeuroDesarrollo Sur se ha unido a la red.", timestamp: "Hace 2 horas", type: "success" },
    { id: "a2", title: "Mantenimiento programado", description: "Actualización de base de datos el domingo a las 02:00 AM.", timestamp: "Hace 5 horas", type: "warning" },
    { id: "a3", title: "Picos de latencia en API", description: "Se detectó latencia inusual en el módulo de reportes.", timestamp: "Hace 1 día", type: "error" },
  ]
};

export const clinicAdminMockData: DashboardData = {
  kpis: [
    { id: "1", label: "Pacientes Activos", value: 450, trend: 5.2, iconType: "users", color: "#2A9D8F" },
    { id: "2", label: "Profesionales en Plantilla", value: 18, trend: 0, iconType: "medical", color: "#457B9D" },
    { id: "3", label: "Turnos de Hoy", value: 85, trend: -2.4, iconType: "calendar", color: "#F4A261" },
    { id: "4", label: "Ingresos (Mensual)", value: "$125K", trend: 8.5, iconType: "activity", color: "#2A9D8F" },
  ],
  growthChart: {
    categories: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
    series: [
      { name: "Atenciones Realizadas", data: [75, 82, 90, 85, 95, 40, 0], color: "#2A9D8F" },
      { name: "Cancelaciones", data: [5, 3, 8, 4, 6, 2, 0], color: "#E76F51" }
    ]
  },
  distributionChart: [
    { name: "Psicología", y: 40, color: "#2A9D8F" },
    { name: "Terapia de Lenguaje", y: 30, color: "#E9C46A" },
    { name: "Terapia Ocupacional", y: 20, color: "#F4A261" },
    { name: "Neurología", y: 10, color: "#457B9D" }
  ],
  recentActivity: [
    { id: "c1", title: "Profesional dado de alta", description: "Dra. Ana López (Neurología) activó su cuenta.", timestamp: "Hace 1 hora", type: "success" },
    { id: "c2", title: "Turnos cancelados", description: "3 pacientes cancelaron turno hoy.", timestamp: "Hace 3 horas", type: "warning" },
    { id: "c3", title: "Cierre de caja completado", description: "Cierre de caja del día de ayer finalizado con éxito.", timestamp: "Hace 1 día", type: "info" },
  ]
};

export const profesionalMockData: DashboardData = {
  kpis: [
    { id: "1", label: "Mis Pacientes", value: 42, trend: 2.5, iconType: "users", color: "#457B9D" },
    { id: "2", label: "Sesiones Hoy", value: 7, iconType: "calendar", color: "#2A9D8F" },
    { id: "3", label: "Informes Pendientes", value: 3, trend: -1, trendLabel: "vs ayer", iconType: "activity", color: "#E76F51" },
    { id: "4", label: "Horas Clínicas", value: "32h", trend: 5.0, trendLabel: "esta semana", iconType: "medical", color: "#F4A261" },
  ],
  growthChart: {
    categories: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    series: [
      { name: "Sesiones Completadas", data: [25, 28, 24, 30], color: "#457B9D" }
    ]
  },
  distributionChart: [
    { name: "Presencial", y: 75, color: "#457B9D" },
    { name: "Teleasistencia", y: 25, color: "#E9C46A" }
  ],
  recentActivity: [
    { id: "p1", title: "Sesión completada", description: "Terapia de lenguaje con Mateo R.", timestamp: "Hace 30 mins", type: "success" },
    { id: "p2", title: "Informe requerido", description: "Reporte mensual pendiente para paciente Lucía G.", timestamp: "Hace 2 horas", type: "warning" },
    { id: "p3", title: "Nuevo paciente asignado", description: "Se te ha asignado el caso de Tomás B.", timestamp: "Hace 1 día", type: "info" },
  ]
};

export const tutorMockData: DashboardData = {
  kpis: [
    { id: "1", label: "Próxima Cita", value: "Mañana, 10:00 AM", iconType: "calendar", color: "#2A9D8F" },
    { id: "2", label: "Progreso Mensual", value: "85%", trend: 5, iconType: "activity", color: "#457B9D" },
    { id: "3", label: "Alertas Clínicas", value: 0, iconType: "medical", color: "#E76F51" },
  ],
  growthChart: {
    categories: ["Semana 1", "Semana 2", "Semana 3", "Semana 4"],
    series: [
      { name: "Cumplimiento de Objetivos (%)", data: [60, 75, 80, 85], color: "#2A9D8F" }
    ]
  },
  distributionChart: [
    { name: "Logros alcanzados", y: 8, color: "#2A9D8F" },
    { name: "En proceso", y: 3, color: "#F4A261" },
    { name: "Requiere atención", y: 1, color: "#E76F51" }
  ],
  recentActivity: [
    { id: "t1", title: "Informe disponible", description: "El terapeuta ha compartido un nuevo reporte de evolución.", timestamp: "Ayer", type: "info" },
    { id: "t2", title: "Asistencia confirmada", description: "Asistieron a la sesión de Terapia Ocupacional.", timestamp: "Hace 3 días", type: "success" },
  ]
};
