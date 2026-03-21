import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.3",
    info: {
      title: "AutiSense API",
      version: "1.0.0",
      description:
        "Documentación interactiva de la API REST de AutiSense Platform. Usa el botón **Authorize** para ingresar tu Bearer token JWT.",
    },
    servers: [
      {
        url: process.env.API_URL ?? "http://localhost:4000",
        description:
          process.env.NODE_ENV === "production" ? "Servidor AWS" : "Desarrollo local",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        // ─── Common ──────────────────────────────────────────────────────────
        ErrorResponse: {
          type: "object",
          properties: {
            message: { type: "string", example: "Mensaje de error" },
          },
        },
        PaginationMeta: {
          type: "object",
          properties: {
            page: { type: "integer", example: 1 },
            pageSize: { type: "integer", example: 10 },
            total: { type: "integer", example: 42 },
          },
        },
        // ─── Clinica ─────────────────────────────────────────────────────────
        Clinica: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            razon_social: { type: "string", nullable: true },
            rfc: { type: "string", nullable: true },
            telefono: { type: "string", nullable: true },
            correo_contacto: { type: "string", nullable: true },
            direccion: { type: "string", nullable: true },
            estado: { type: "string", enum: ["activa", "suspendida"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        ClinicaBody: {
          type: "object",
          required: ["nombre"],
          properties: {
            nombre: { type: "string", example: "Clínica Esperanza" },
            razon_social: { type: "string", example: "Clínica Esperanza S.A. de C.V." },
            rfc: { type: "string", example: "CES010101AAA" },
            telefono: { type: "string", example: "9991234567" },
            correo_contacto: { type: "string", example: "contacto@clinica.mx" },
            direccion: { type: "string", example: "Calle 20 #100, Mérida, Yucatán" },
            estado: { type: "string", enum: ["activa", "suspendida"], default: "activa" },
          },
        },
        // ─── Usuario ─────────────────────────────────────────────────────────
        Usuario: {
          type: "object",
          properties: {
            id: { type: "integer" },
            correo: { type: "string", format: "email" },
            estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
            mfaEnabled: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            rol: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                rol: { type: "string" },
                descripcion: { type: "string", nullable: true },
              },
            },
            clinica: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                nombre: { type: "string" },
                estado: { type: "string" },
              },
            },
            id_clinica: { type: "integer", nullable: true },
            id_rol: { type: "integer" },
          },
        },
        // ─── Profesional ─────────────────────────────────────────────────────
        Profesional: {
          type: "object",
          properties: {
            id: { type: "integer" },
            nombre: { type: "string" },
            ap_paterno: { type: "string" },
            ap_materno: { type: "string" },
            telefono: { type: "string" },
            especialidad: { type: "string" },
            organizacion: { type: "string" },
            foto_url: { type: "string" },
            foto_public_id: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
            usuario: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                correo: { type: "string" },
                estado: { type: "string" },
                must_change_password: { type: "boolean" },
              },
            },
            clinica: {
              type: "object",
              nullable: true,
              properties: {
                id: { type: "integer" },
                nombre: { type: "string" },
                estado: { type: "string" },
              },
            },
            id_usuario: { type: "integer" },
            id_clinica: { type: "integer" },
          },
        },
        // ─── Paciente ─────────────────────────────────────────────────────────
        Paciente: {
          type: "object",
          properties: {
            id: { type: "integer" },
            id_clinica: { type: "integer" },
            clinicaNombre: { type: "string", nullable: true },
            nombre: { type: "string" },
            ap_paterno: { type: "string" },
            ap_materno: { type: "string", nullable: true },
            fecha_nacimiento: { type: "string", format: "date" },
            sexo: { type: "string", enum: ["M", "F", "Otro"] },
            escolaridad: { type: "string", nullable: true },
            diagnostico_presuntivo: { type: "string", nullable: true },
            antecedentes_relevantes: { type: "string", nullable: true },
            notas_generales: { type: "string", nullable: true },
            estado: { type: "string", enum: ["activo", "inactivo"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // ─── Tutor ───────────────────────────────────────────────────────────
        Tutor: {
          type: "object",
          properties: {
            id: { type: "integer" },
            usuarioId: { type: "integer" },
            nombre: { type: "string" },
            ap_paterno: { type: "string" },
            ap_materno: { type: "string", nullable: true },
            nombreCompleto: { type: "string" },
            telefono: { type: "string", nullable: true },
            correo: { type: "string", format: "email" },
            estado: { type: "string" },
            mfaEnabled: { type: "boolean" },
            clinicaId: { type: "integer" },
            clinicaNombre: { type: "string", nullable: true },
            pacientesVinculados: { type: "integer" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        // ─── AuditLog ────────────────────────────────────────────────────────
        AuditLog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            userId: { type: "integer", nullable: true },
            userEmail: { type: "string", nullable: true },
            userRole: { type: "string", nullable: true },
            action: { type: "string", example: "LOGIN_OK" },
            entity: { type: "string", nullable: true },
            entityId: { type: "integer", nullable: true },
            detail: { type: "string", nullable: true },
            ip: { type: "string", nullable: true },
            statusCode: { type: "integer", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        // ─── Auth Responses ──────────────────────────────────────────────────
        TokenResponse: {
          type: "object",
          properties: {
            accessToken: { type: "string" },
            refreshToken: { type: "string" },
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                correo: { type: "string" },
                role: { type: "string" },
                clinicId: { type: "integer", nullable: true },
                mfaEnabled: { type: "boolean" },
              },
            },
          },
        },
        MfaChallengeResponse: {
          type: "object",
          properties: {
            requiresMfa: { type: "boolean", example: true },
            challengeId: { type: "string" },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Auth", description: "Autenticación y sesión" },
      { name: "Me", description: "Perfil del usuario autenticado" },
      { name: "Clínicas", description: "Gestión de clínicas (solo super_admin)" },
      { name: "Usuarios", description: "Gestión de cuentas de usuario" },
      { name: "Profesionales", description: "Gestión de profesionales de salud" },
      { name: "Pacientes", description: "Gestión de pacientes" },
      { name: "Tutores", description: "Gestión de tutores" },
      { name: "Audit Logs", description: "Registros de auditoría (solo super_admin)" },
    ],
    paths: {
      // ═══════════════════════════════════════════════════════════════════════
      // AUTH
      // ═══════════════════════════════════════════════════════════════════════
      "/auth/login": {
        post: {
          tags: ["Auth"],
          summary: "Iniciar sesión",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["correo", "password"],
                  properties: {
                    correo: { type: "string", format: "email", example: "admin@autisense.com" },
                    password: { type: "string", example: "Contraseña123!" },
                  },
                },
              },
            },
          },
          responses: {
            "200": {
              description: "Login exitoso (con tokens) o requiere MFA",
              content: {
                "application/json": {
                  schema: {
                    oneOf: [
                      { $ref: "#/components/schemas/TokenResponse" },
                      { $ref: "#/components/schemas/MfaChallengeResponse" },
                    ],
                  },
                },
              },
            },
            "400": { description: "Datos inválidos", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "401": { description: "Credenciales incorrectas", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "500": { description: "Error interno", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/auth/mfa/verify": {
        post: {
          tags: ["Auth"],
          summary: "Verificar código MFA",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["challengeId", "code"],
                  properties: {
                    challengeId: { type: "string" },
                    code: { type: "string", example: "123456" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "MFA verificado. Retorna tokens", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
            "400": { description: "Código inválido o expirado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "429": { description: "Demasiados intentos fallidos. Bloqueo temporal", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/auth/mfa/resend": {
        post: {
          tags: ["Auth"],
          summary: "Reenviar código MFA",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["challengeId"],
                  properties: {
                    challengeId: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Código reenviado", content: { "application/json": { schema: { type: "object", properties: { ok: { type: "boolean" } } } } } },
            "400": { description: "challengeId inválido o expirado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/auth/refresh": {
        post: {
          tags: ["Auth"],
          summary: "Renovar access token usando refresh token",
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Nuevos tokens generados", content: { "application/json": { schema: { $ref: "#/components/schemas/TokenResponse" } } } },
            "401": { description: "Refresh token inválido o expirado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/auth/logout": {
        post: {
          tags: ["Auth"],
          summary: "Cerrar sesión (invalida el refresh token)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["refreshToken"],
                  properties: {
                    refreshToken: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Sesión cerrada exitosamente" },
            "401": { description: "No autorizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/auth/change-password": {
        post: {
          tags: ["Auth"],
          summary: "Cambiar contraseña (flujo obligatorio al primer inicio)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword", "confirmPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 8 },
                    confirmPassword: { type: "string" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Contraseña actualizada" },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "401": { description: "Contraseña actual incorrecta", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // ME
      // ═══════════════════════════════════════════════════════════════════════
      "/me/password": {
        patch: {
          tags: ["Me"],
          summary: "Cambiar mi contraseña",
          responses: {
            "200": { description: "Contraseña actualizada" },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "401": { description: "No autorizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["currentPassword", "newPassword", "confirmPassword"],
                  properties: {
                    currentPassword: { type: "string" },
                    newPassword: { type: "string", minLength: 8 },
                    confirmPassword: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
      "/me/mfa": {
        patch: {
          tags: ["Me"],
          summary: "Activar o desactivar mi MFA",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["mfaEnabled"],
                  properties: {
                    mfaEnabled: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "MFA actualizado" },
            "401": { description: "No autorizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/me/profile": {
        patch: {
          tags: ["Me"],
          summary: "Actualizar mi perfil (teléfono)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    telefono: { type: "string", example: "9991234567" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Perfil actualizado" },
            "401": { description: "No autorizado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // CLÍNICAS
      // ═══════════════════════════════════════════════════════════════════════
      "/clinicas": {
        get: {
          tags: ["Clínicas"],
          summary: "Listar clínicas (paginado)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "q", in: "query", schema: { type: "string" }, description: "Búsqueda en nombre, rfc, correo, teléfono" },
            { name: "estado", in: "query", schema: { type: "string", enum: ["activa", "suspendida"] } },
            { name: "sortField", in: "query", schema: { type: "string", default: "createdAt" } },
            { name: "sortDirection", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "desc" } },
          ],
          responses: {
            "200": {
              description: "Lista de clínicas",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PaginationMeta" },
                      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Clinica" } } } },
                    ],
                  },
                },
              },
            },
            "401": { description: "No autorizado" },
            "403": { description: "Prohibido" },
          },
        },
        post: {
          tags: ["Clínicas"],
          summary: "Crear una nueva clínica",
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ClinicaBody" } } },
          },
          responses: {
            "201": { description: "Clínica creada", content: { "application/json": { schema: { $ref: "#/components/schemas/Clinica" } } } },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "401": { description: "No autorizado" },
            "403": { description: "Prohibido" },
          },
        },
      },
      "/clinicas/{id}": {
        put: {
          tags: ["Clínicas"],
          summary: "Actualizar una clínica",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: { "application/json": { schema: { $ref: "#/components/schemas/ClinicaBody" } } },
          },
          responses: {
            "200": { description: "Clínica actualizada", content: { "application/json": { schema: { $ref: "#/components/schemas/Clinica" } } } },
            "400": { description: "id inválido", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "404": { description: "Clínica no encontrada" },
          },
        },
        delete: {
          tags: ["Clínicas"],
          summary: "Dar de baja (suspender) una clínica",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Clínica suspendida", content: { "application/json": { schema: { $ref: "#/components/schemas/Clinica" } } } },
            "400": { description: "id inválido" },
            "404": { description: "Clínica no encontrada" },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // USUARIOS
      // ═══════════════════════════════════════════════════════════════════════
      "/usuarios": {
        get: {
          tags: ["Usuarios"],
          summary: "Listar usuarios (paginado)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "role", in: "query", schema: { type: "string", enum: ["super_admin", "clinic_admin", "profesional", "tutor"] } },
            { name: "estado", in: "query", schema: { type: "string", enum: ["activo", "suspendido", "pendiente"] } },
            { name: "clinicaId", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": {
              description: "Lista de usuarios",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PaginationMeta" },
                      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Usuario" } } } },
                    ],
                  },
                },
              },
            },
            "401": { description: "No autorizado" },
            "403": { description: "Prohibido" },
          },
        },
        post: {
          tags: ["Usuarios"],
          summary: "Crear un nuevo usuario",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["correo", "password", "role"],
                  properties: {
                    correo: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"], default: "activo" },
                    role: { type: "string", enum: ["super_admin", "clinic_admin", "profesional", "tutor"] },
                    clinicaId: { type: "integer", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Usuario creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Usuario" } } } },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "409": { description: "Correo ya registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/usuarios/{id}": {
        put: {
          tags: ["Usuarios"],
          summary: "Actualizar un usuario",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    correo: { type: "string", format: "email" },
                    password: { type: "string" },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                    role: { type: "string" },
                    clinicaId: { type: "integer", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Usuario actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Usuario" } } } },
            "404": { description: "Usuario no encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "409": { description: "Correo ya registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/usuarios/{id}/status": {
        patch: {
          tags: ["Usuarios"],
          summary: "Cambiar el estado de un usuario",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["estado"],
                  properties: {
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Estado actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Usuario" } } } },
            "403": { description: "Prohibido", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "404": { description: "No encontrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/usuarios/{id}/mfa": {
        patch: {
          tags: ["Usuarios"],
          summary: "Activar o desactivar el MFA de un usuario",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["enabled"],
                  properties: {
                    enabled: { type: "boolean" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "MFA actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Usuario" } } } },
            "403": { description: "Prohibido" },
            "404": { description: "No encontrado" },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // PROFESIONALES
      // ═══════════════════════════════════════════════════════════════════════
      "/profesionales": {
        get: {
          tags: ["Profesionales"],
          summary: "Listar profesionales (paginado)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "estado", in: "query", schema: { type: "string", enum: ["activo", "suspendido", "pendiente"] } },
            { name: "clinicaId", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": {
              description: "Lista de profesionales",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PaginationMeta" },
                      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Profesional" } } } },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Profesionales"],
          summary: "Crear un profesional (con foto opcional)",
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["correo", "password", "nombre", "ap_paterno", "telefono", "especialidad", "organizacion", "clinicaId"],
                  properties: {
                    correo: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string" },
                    telefono: { type: "string" },
                    especialidad: { type: "string" },
                    organizacion: { type: "string" },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"], default: "activo" },
                    clinicaId: { type: "integer" },
                    foto: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Profesional creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Profesional" } } } },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "409": { description: "Correo o teléfono ya registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/profesionales/{id}": {
        put: {
          tags: ["Profesionales"],
          summary: "Actualizar un profesional (con foto opcional)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  properties: {
                    correo: { type: "string", format: "email" },
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string" },
                    telefono: { type: "string" },
                    especialidad: { type: "string" },
                    organizacion: { type: "string" },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                    clinicaId: { type: "integer" },
                    foto: { type: "string", format: "binary" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Profesional actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Profesional" } } } },
            "403": { description: "Sin permiso para editar este perfil" },
            "404": { description: "Profesional no encontrado" },
            "409": { description: "Correo o teléfono ya en uso" },
          },
        },
      },
      "/profesionales/{id}/status": {
        patch: {
          tags: ["Profesionales"],
          summary: "Cambiar el estado de un profesional",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["estado"],
                  properties: {
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Estado actualizado" },
            "403": { description: "Sin permiso" },
            "404": { description: "No encontrado" },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // PACIENTES
      // ═══════════════════════════════════════════════════════════════════════
      "/pacientes": {
        get: {
          tags: ["Pacientes"],
          summary: "Listar pacientes (paginado)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "estado", in: "query", schema: { type: "string", enum: ["activo", "inactivo"] } },
            { name: "sexo", in: "query", schema: { type: "string", enum: ["M", "F", "Otro"] } },
            { name: "clinicaId", in: "query", schema: { type: "integer" } },
          ],
          responses: {
            "200": {
              description: "Lista de pacientes",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PaginationMeta" },
                      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Paciente" } } } },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Pacientes"],
          summary: "Registrar un nuevo paciente",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["nombre", "ap_paterno", "fecha_nacimiento", "sexo", "clinicaId"],
                  properties: {
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string", nullable: true },
                    fecha_nacimiento: { type: "string", format: "date", example: "2015-06-20" },
                    sexo: { type: "string", enum: ["M", "F", "Otro"] },
                    escolaridad: { type: "string", nullable: true },
                    diagnostico_presuntivo: { type: "string", nullable: true },
                    antecedentes_relevantes: { type: "string", nullable: true },
                    notas_generales: { type: "string", nullable: true },
                    clinicaId: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Paciente creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Paciente" } } } },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/pacientes/{id}": {
        get: {
          tags: ["Pacientes"],
          summary: "Obtener un paciente por ID (incluye tutores)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Paciente con tutores", content: { "application/json": { schema: { $ref: "#/components/schemas/Paciente" } } } },
            "404": { description: "No encontrado" },
          },
        },
        put: {
          tags: ["Pacientes"],
          summary: "Actualizar datos del paciente (body parcial)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string", nullable: true },
                    fecha_nacimiento: { type: "string", format: "date" },
                    sexo: { type: "string", enum: ["M", "F", "Otro"] },
                    escolaridad: { type: "string", nullable: true },
                    diagnostico_presuntivo: { type: "string", nullable: true },
                    antecedentes_relevantes: { type: "string", nullable: true },
                    notas_generales: { type: "string", nullable: true },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Paciente actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Paciente" } } } },
            "404": { description: "No encontrado" },
          },
        },
      },
      "/pacientes/{id}/status": {
        patch: {
          tags: ["Pacientes"],
          summary: "Cambiar el estado de un paciente",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["estado"],
                  properties: {
                    estado: { type: "string", enum: ["activo", "inactivo"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Estado actualizado" },
            "404": { description: "No encontrado" },
          },
        },
      },
      "/pacientes/{id}/tutores": {
        get: {
          tags: ["Pacientes"],
          summary: "Listar tutores vinculados a un paciente",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Lista de tutores vinculados" },
            "404": { description: "Paciente no encontrado" },
          },
        },
        post: {
          tags: ["Pacientes"],
          summary: "Vincular un tutor a un paciente",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["userId", "parentesco"],
                  properties: {
                    userId: { type: "integer" },
                    parentesco: { type: "string", example: "Madre" },
                    esPrincipal: { type: "boolean", default: false },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Tutored vinculado" },
            "400": { description: "userId inválido o sin rol tutor" },
            "409": { description: "Tutor ya vinculado" },
          },
        },
      },
      "/pacientes/{id}/tutores/{tutorId}": {
        delete: {
          tags: ["Pacientes"],
          summary: "Desvincular un tutor de un paciente",
          parameters: [
            { name: "id", in: "path", required: true, schema: { type: "integer" } },
            { name: "tutorId", in: "path", required: true, schema: { type: "integer" } },
          ],
          responses: {
            "200": { description: "Tutor desvinculado" },
            "404": { description: "Vínculo no encontrado" },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // TUTORES
      // ═══════════════════════════════════════════════════════════════════════
      "/tutores": {
        get: {
          tags: ["Tutores"],
          summary: "Listar tutores (paginado)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 10 } },
            { name: "q", in: "query", schema: { type: "string" } },
            { name: "estado", in: "query", schema: { type: "string", enum: ["activo", "suspendido", "pendiente"] } },
            { name: "clinicaId", in: "query", schema: { type: "integer" } },
            { name: "sortField", in: "query", schema: { type: "string", default: "nombre" } },
            { name: "sortDirection", in: "query", schema: { type: "string", enum: ["asc", "desc"], default: "asc" } },
          ],
          responses: {
            "200": {
              description: "Lista de tutores",
              content: {
                "application/json": {
                  schema: {
                    allOf: [
                      { $ref: "#/components/schemas/PaginationMeta" },
                      { type: "object", properties: { items: { type: "array", items: { $ref: "#/components/schemas/Tutor" } } } },
                    ],
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ["Tutores"],
          summary: "Crear un tutor (crea usuario + perfil)",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["correo", "password", "nombre", "ap_paterno", "clinicaId"],
                  properties: {
                    correo: { type: "string", format: "email" },
                    password: { type: "string", minLength: 8 },
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string" },
                    telefono: { type: "string" },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"], default: "activo" },
                    clinicaId: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "201": { description: "Tutor creado", content: { "application/json": { schema: { $ref: "#/components/schemas/Tutor" } } } },
            "400": { description: "Validación fallida", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "409": { description: "Correo ya registrado", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
          },
        },
      },
      "/tutores/{id}": {
        get: {
          tags: ["Tutores"],
          summary: "Obtener un tutor por ID (incluye pacientes vinculados)",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          responses: {
            "200": { description: "Tutor con lista de pacientes" },
            "404": { description: "No encontrado" },
          },
        },
        put: {
          tags: ["Tutores"],
          summary: "Actualizar datos de un tutor",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    correo: { type: "string", format: "email" },
                    nombre: { type: "string" },
                    ap_paterno: { type: "string" },
                    ap_materno: { type: "string" },
                    telefono: { type: "string" },
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                    clinicaId: { type: "integer" },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Tutor actualizado", content: { "application/json": { schema: { $ref: "#/components/schemas/Tutor" } } } },
            "404": { description: "No encontrado" },
            "409": { description: "Correo ya en uso" },
          },
        },
      },
      "/tutores/{id}/status": {
        patch: {
          tags: ["Tutores"],
          summary: "Cambiar el estado de un tutor",
          parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["estado"],
                  properties: {
                    estado: { type: "string", enum: ["activo", "suspendido", "pendiente"] },
                  },
                },
              },
            },
          },
          responses: {
            "200": { description: "Estado del tutor actualizado" },
            "404": { description: "No encontrado" },
          },
        },
      },
      // ═══════════════════════════════════════════════════════════════════════
      // AUDIT LOGS
      // ═══════════════════════════════════════════════════════════════════════
      "/audit-logs": {
        get: {
          tags: ["Audit Logs"],
          summary: "Listar registros de auditoría (solo super_admin)",
          parameters: [
            { name: "page", in: "query", schema: { type: "integer", default: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 20 } },
            { name: "action", in: "query", schema: { type: "string" }, description: "Filtrar por nombre de acción (ej: LOGIN_OK)" },
            { name: "userId", in: "query", schema: { type: "integer" }, description: "Filtrar por ID de usuario" },
            { name: "from", in: "query", schema: { type: "string", format: "date" }, description: "Fecha de inicio (ISO date)" },
            { name: "to", in: "query", schema: { type: "string", format: "date" }, description: "Fecha de fin (ISO date)" },
          ],
          responses: {
            "200": {
              description: "Registros de auditoría",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { type: "array", items: { $ref: "#/components/schemas/AuditLog" } },
                      total: { type: "integer" },
                      page: { type: "integer" },
                      pageSize: { type: "integer" },
                    },
                  },
                },
              },
            },
            "401": { description: "No autorizado" },
            "403": { description: "Solo super_admin" },
          },
        },
      },
    },
  },
  apis: [],
};

export const swaggerSpec = swaggerJsdoc(options);
