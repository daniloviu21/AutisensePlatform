-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "must_change_password" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Profesional" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "ap_paterno" TEXT NOT NULL,
    "ap_materno" TEXT,
    "telefono" TEXT,
    "especialidad" TEXT NOT NULL,
    "organizacion" TEXT,
    "foto_url" TEXT,
    "foto_public_id" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profesional_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profesional_id_usuario_key" ON "Profesional"("id_usuario");

-- CreateIndex
CREATE INDEX "Profesional_id_clinica_idx" ON "Profesional"("id_clinica");

-- CreateIndex
CREATE INDEX "Profesional_especialidad_idx" ON "Profesional"("especialidad");

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profesional" ADD CONSTRAINT "Profesional_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
