-- CreateTable
CREATE TABLE "Paciente" (
    "id" SERIAL NOT NULL,
    "id_clinica" INTEGER NOT NULL,
    "nombre" TEXT NOT NULL,
    "ap_paterno" TEXT NOT NULL,
    "ap_materno" TEXT,
    "fecha_nacimiento" DATE NOT NULL,
    "sexo" TEXT NOT NULL,
    "escolaridad" TEXT,
    "diagnostico_presuntivo" TEXT,
    "antecedentes_relevantes" TEXT,
    "notas_generales" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paciente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorPaciente" (
    "id" SERIAL NOT NULL,
    "id_paciente" INTEGER NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "parentesco" TEXT NOT NULL,
    "es_principal" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorPaciente_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Paciente_id_clinica_idx" ON "Paciente"("id_clinica");

-- CreateIndex
CREATE INDEX "Paciente_estado_idx" ON "Paciente"("estado");

-- CreateIndex
CREATE INDEX "TutorPaciente_id_paciente_idx" ON "TutorPaciente"("id_paciente");

-- CreateIndex
CREATE UNIQUE INDEX "TutorPaciente_id_paciente_id_usuario_key" ON "TutorPaciente"("id_paciente", "id_usuario");

-- AddForeignKey
ALTER TABLE "Paciente" ADD CONSTRAINT "Paciente_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPaciente" ADD CONSTRAINT "TutorPaciente_id_paciente_fkey" FOREIGN KEY ("id_paciente") REFERENCES "Paciente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPaciente" ADD CONSTRAINT "TutorPaciente_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
