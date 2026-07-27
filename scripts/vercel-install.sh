#!/bin/bash
# Instala dependencias, con reintentos: npm tiene un bug intermitente al
# clonar dependencias de git (@creart/tienda-core) que a veces deja una
# carpeta temporal a medio crear y falla con "already exists". Reintentar
# unas pocas veces resuelve la gran mayoria de los casos.

if [ -n "$GH_TOKEN" ]; then
  git config --global "url.https://${GH_TOKEN}@github.com/.insteadOf" "ssh://git@github.com/"
fi

for i in 1 2 3 4 5; do
  echo "Intento $i de instalar dependencias..."
  rm -rf node_modules/@creart/tienda-core
  if npm install; then
    echo "Instalacion OK en el intento $i"
    exit 0
  fi
  echo "Intento $i fallo, reintentando en 3s..."
  sleep 3
done

echo "Fallaron los 5 intentos de instalacion"
exit 1
