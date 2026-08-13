#!/bin/bash

echo "═══════════════════════════════════════════════════════════"
echo "🧪 TESTE DE FUNCIONALIDADE DOS PLUGINS - AZOTRACE"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Contador de testes
TESTS_PASSED=0
TESTS_FAILED=0

test_plugin() {
  local name=$1
  local path=$2
  
  echo -n "🔍 Testando plugin: ${BLUE}$name${NC} ... "
  
  if [ -d "$path" ]; then
    if [ -f "$path/package.json" ] && [ -f "$path/index.tsx" ]; then
      echo -e "${GREEN}✅ OK${NC}"
      TESTS_PASSED=$((TESTS_PASSED+1))
      
      # Mostrar detalhes
      if grep -q "export" "$path/index.tsx"; then
        echo "   📦 Exports encontrados:"
        grep -E "^export (function|const|default)" "$path/index.tsx" | sed 's/^/     /'
      fi
    else
      echo -e "${RED}❌ FALHA - Ficheiros em falta${NC}"
      TESTS_FAILED=$((TESTS_FAILED+1))
    fi
  else
    echo -e "${RED}❌ FALHA - Pasta não encontrada${NC}"
    TESTS_FAILED=$((TESTS_FAILED+1))
  fi
  echo ""
}

# Testar cada plugin
echo "📦 VERIFICANDO PLUGINS INSTALADOS"
echo "────────────────────────────────────"
echo ""

test_plugin "feedback" "packages/@kit/feedback"
test_plugin "testimonial" "packages/@kit/testimonial"
test_plugin "supabase-cms" "packages/@kit/supabase-cms"
test_plugin "google-analytics" "packages/@kit/google-analytics"

echo "────────────────────────────────────"
echo ""

# Verificar se estão no package.json
echo "📋 VERIFICANDO DEPENDÊNCIAS NO PACKAGE.JSON"
echo "────────────────────────────────────"
echo ""

for plugin in feedback testimonial supabase-cms google-analytics; do
  if grep -q "\"@kit/$plugin\"" apps/web/package.json; then
    echo -e "✅ @kit/$plugin ${GREEN}encontrado no package.json${NC}"
    TESTS_PASSED=$((TESTS_PASSED+1))
  else
    echo -e "❌ @kit/$plugin ${RED}NÃO encontrado no package.json${NC}"
    TESTS_FAILED=$((TESTS_FAILED+1))
  fi
done

echo ""
echo "────────────────────────────────────"
echo ""

# Verificar tabelas no Supabase
echo "🗄️ VERIFICANDO TABELAS NO SUPABASE"
echo "────────────────────────────────────"
echo ""

echo "⚠️ Para verificar as tabelas, executa no SQL Editor do Supabase:"
echo ""
echo "SELECT table_name FROM information_schema.tables WHERE table_name IN ('feedbacks', 'testimonials', 'blog_posts');"
echo ""

# Verificar imports
echo "📁 VERIFICANDO IMPORTS NAS PÁGINAS"
echo "────────────────────────────────────"
echo ""

check_import() {
  local file=$1
  local plugin=$2
  if [ -f "$file" ]; then
    if grep -q "from '~/plugins/$plugin'" "$file" || grep -q "from '../plugins/$plugin'" "$file"; then
      echo -e "✅ $plugin ${GREEN}importado em $file${NC}"
      TESTS_PASSED=$((TESTS_PASSED+1))
    else
      echo -e "⚠️ $plugin ${YELLOW}não encontrado em $file${NC}"
    fi
  fi
}

check_import "apps/web/app/dashboard/layout.tsx" "feedback"
check_import "apps/web/app/(marketing)/page.tsx" "testimonial"
check_import "apps/web/app/blog/page.tsx" "supabase-cms"
check_import "apps/web/app/layout.tsx" "google-analytics"

echo ""
echo "────────────────────────────────────"
echo ""

# Resumo
echo "═══════════════════════════════════════════════════════════"
echo "📊 RESUMO DOS TESTES"
echo "═══════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Testes passados: $TESTS_PASSED${NC}"
echo -e "${RED}❌ Testes falhados: $TESTS_FAILED${NC}"
echo "═══════════════════════════════════════════════════════════"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
  echo -e "${GREEN}🎉 TODOS OS PLUGINS ESTÃO FUNCIONAIS!${NC}"
  echo ""
  echo "📌 Podes testar manualmente:"
  echo "   🔗 http://localhost:3000 - Landing com testemunhos"
  echo "   🔗 http://localhost:3000/dashboard - Botão de feedback"
  echo "   🔗 http://localhost:3000/blog - Blog"
  echo "   🔗 http://localhost:3000/dashboard/administracao/feedback - Admin Feedback"
  echo "   🔗 http://localhost:3000/dashboard/administracao/testimonials - Admin Testemunhos"
  echo "   🔗 http://localhost:3000/dashboard/administracao/blog - Admin Blog"
else
  echo -e "${RED}⚠️ Alguns plugins precisam de atenção.${NC}"
fi
