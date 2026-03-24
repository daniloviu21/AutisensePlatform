import { Router } from "express";
import * as checkoutController from "./checkout.controller";

export const checkoutRouter = Router();

/**
 * @swagger
 * /checkout/session:
 *   post:
 *     summary: Inicia una sesión de checkout
 *     tags: [Checkout]
 */
checkoutRouter.post("/session", checkoutController.crearSesion);

/**
 * @swagger
 * /checkout/session/{token}:
 *   get:
 *     summary: Obtiene detalles de una sesión de checkout
 *     tags: [Checkout]
 */
checkoutRouter.get("/session/:token", checkoutController.getSesion);

/**
 * @swagger
 * /checkout/session/{token}/pago:
 *   post:
 *     summary: Simula un pago exitoso
 *     tags: [Checkout]
 */
checkoutRouter.post("/session/:token/pago", checkoutController.simularPago);

/**
 * @swagger
 * /checkout/session/{token}/finalizar:
 *   post:
 *     summary: Finaliza el registro tras el pago (transaccional)
 *     tags: [Checkout]
 */
checkoutRouter.post("/session/:token/finalizar", checkoutController.finalizarRegistro);
