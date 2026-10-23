import { Settings, Package, Users, Lock, Shield, CreditCard } from 'lucide-react';
import type { NavigationItem } from '../components/AccessibleSidebarAtualizado';

// Estrutura de MenuAdmin: as opções têm acesso direto às páginas.
export const administrationItem: NavigationItem = {
  "id": "administracao",
  "label": "Administração",
  "icon": Settings,
  "description": "Empresa, produtos, utilizadores, privacidade, segurança e subscrições.",
  "children": [
    {
      "id": "geral",
      "label": "Geral",
      "icon": Settings,
      "children": [
        {
          "id": "geral-empresa",
          "label": "Dados da Empresa",
          "icon": Settings,
          "path": "/dashboard/administracao/empresa",
          "permission": "users.manage"
        }
      ]
    },
    {
      "id": "produtos",
      "label": "Produtos",
      "icon": Package,
      "children": [
        {
          "id": "produtos-categorias",
          "label": "Categorias de Produtos",
          "icon": Package,
          "path": "/dashboard/administracao/categorias",
          "permission": "products.manage"
        },
        {
          "id": "produtos-campos",
          "label": "Campos dos Produtos",
          "icon": Package,
          "path": "/dashboard/administracao/campos",
          "permission": "products.manage"
        },
        {
          "id": "produtos-negocios",
          "label": "Negócios",
          "icon": Package,
          "path": "/dashboard/administracao/negocios",
          "permission": "business.manage"
        }
      ]
    },
    {
      "id": "users",
      "label": "Utilizadores",
      "icon": Users,
      "children": [
        {
          "id": "users-list",
          "label": "Lista de utilizadores",
          "icon": Users,
          "path": "/dashboard/administracao/utilizadores",
          "permission": "users.manage"
        },
        {
          "id": "users-create",
          "label": "Criar Utilizador",
          "icon": Users,
          "path": "/dashboard/administracao/utilizadores/criar",
          "permission": "users.manage"
        },
        {
          "id": "users-edit",
          "label": "Editar Utilizador",
          "icon": Users,
          "path": "/dashboard/administracao/utilizadores/editar",
          "permission": "users.manage"
        },
        {
          "id": "users-perfis",
          "label": "Perfis e Permissões",
          "icon": Users,
          "path": "/dashboard/administracao/perfis",
          "permission": "users.manage"
        }
      ]
    },
    {
      "id": "rgpd",
      "label": "RGPD / Privacidade",
      "icon": Lock,
      "children": [
        {
          "id": "rgpd-policy",
          "label": "Política de Privacidade",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/politica",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-consents",
          "label": "Consentimentos",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/consentimentos",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-requests",
          "label": "Pedidos dos Titulares",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/pedidos",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-export",
          "label": "Exportação de Dados",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/exportacao",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-delete",
          "label": "Apagamento / Anonimização",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/apagamento",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-retention",
          "label": "Retenção de Dados",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/retencao",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-contractors",
          "label": "Subcontratantes",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/subcontratantes",
          "permission": "rgpd.manage"
        },
        {
          "id": "rgpd-activities",
          "label": "Registo de Atividades",
          "icon": Lock,
          "path": "/dashboard/administracao/rgpd/atividades",
          "permission": "rgpd.manage"
        }
      ]
    },
    {
      "id": "seguranca",
      "label": "Segurança",
      "icon": Shield,
      "children": [
        {
          "id": "seguranca-logs",
          "label": "Logs / Auditoria",
          "icon": Shield,
          "path": "/dashboard/administracao/logs",
          "permission": "security.view"
        },
        {
          "id": "seguranca-qrcodes",
          "label": "QR Codes",
          "icon": Shield,
          "path": "/dashboard/administracao/qrcodes",
          "permission": "traceability.manage"
        }
      ]
    },
    {
      "id": "pagamentos-subscricoes",
      "label": "Pagamentos e subscrições",
      "icon": CreditCard,
      "path": "/dashboard/subscricoes",
      "permission": "billing.manage",
      "roles": [
        "superadmin",
        "admin"
      ]
    }
  ]
};
