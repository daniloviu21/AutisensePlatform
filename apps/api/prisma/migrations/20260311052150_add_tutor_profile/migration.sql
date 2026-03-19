-- CreateTable
CREATE TABLE "Tutor" (
    "id" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "ap_paterno" TEXT NOT NULL,
    "ap_materno" TEXT,
    "telefono" TEXT,
    "parentesco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tutor_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tutor_id_usuario_key" ON "Tutor"("id_usuario");

-- CreateIndex
CREATE INDEX "Tutor_id_clinica_idx" ON "Tutor"("id_clinica");

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tutor" ADD CONSTRAINT "Tutor_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
