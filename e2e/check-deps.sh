#!/bin/bash
# Script para verificar dependencias del sistema para Playwright

echo "🔍 Verificando dependencias del sistema para Playwright..."

# Verificar si estamos en Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Verificar librerías comunes necesarias
    MISSING_LIBS=""
    
    if ! ldconfig -p | grep -q libatk-1.0.so; then
        MISSING_LIBS="$MISSING_LIBS libatk1.0-0"
    fi
    
    if ! ldconfig -p | grep -q libatk-bridge-2.0.so; then
        MISSING_LIBS="$MISSING_LIBS libatk-bridge2.0-0"
    fi
    
    if ! ldconfig -p | grep -q libgbm.so; then
        MISSING_LIBS="$MISSING_LIBS libgbm1"
    fi
    
    if ! ldconfig -p | grep -q libasound.so; then
        MISSING_LIBS="$MISSING_LIBS libasound2"
    fi
    
    if [ -n "$MISSING_LIBS" ]; then
        echo "⚠️  Faltan las siguientes librerías del sistema:$MISSING_LIBS"
        echo ""
        echo "Para instalarlas en Ubuntu/Debian, corre:"
        echo "  sudo apt-get update"
        echo "  sudo apt-get install -y$MISSING_LIBS"
        echo ""
        echo "Para más información, ver: e2e/README.md"
        exit 1
    else
        echo "✅ Todas las dependencias del sistema están instaladas"
        exit 0
    fi
else
    echo "✅ Sistema operativo no requiere verificación de dependencias"
    exit 0
fi
