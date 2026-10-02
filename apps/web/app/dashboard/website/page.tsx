import { redirect } from 'next/navigation';

/**
 * Compatibilidade: o menu pode continuar a apontar para /dashboard/website,
 * mas o editor real vive na área de configuração do negócio.
 *
 * Esta solução evita duplicar o editor e mantém a rota antiga compatível.
 */
export default function WebsitePage() {
  redirect('/dashboard/administracao/negocios/template-website');
}
