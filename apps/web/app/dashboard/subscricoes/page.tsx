import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);

export default async function SubscricoesPage() {
  const { data: subscriptions, error } = await supabaseAdmin
    .from('subscriptions')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Gestão de Subscrições</h1>

      <div className="bg-white rounded-lg shadow overflow-hidden border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">E-mail</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Início</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expira em (1 Ano)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {subscriptions?.map((sub) => {
              const isExpired = new Date(sub.expires_at) < new Date();
              
              return (
                <tr key={sub.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{sub.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{sub.plan_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sub.started_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(sub.expires_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {isExpired ? 'Inativa / Expirada' : 'Ativa'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}