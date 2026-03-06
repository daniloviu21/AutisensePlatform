-- CreateTable
CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "rol" TEXT NOT NULL,
    "descripcion" TEXT,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinica" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "razon_social" TEXT,
    "rfc" TEXT,
    "telefono" TEXT,
    "correo_contacto" TEXT,
    "direccion" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'activa',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Clinica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "correo" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'activo',
    "id_rol" INTEGER NOT NULL,
    "id_clinica" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Role_rol_key" ON "Role"("rol");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_id_clinica_fkey" FOREIGN KEY ("id_clinica") REFERENCES "Clinica"("id") ON DELETE SET NULL ON UPDATE CASCADE;
