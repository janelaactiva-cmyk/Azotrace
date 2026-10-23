import {redirect} from 'next/navigation';
import {connection} from 'next/server';
export default async function PasswordResetPage(){await connection();redirect('/recuperar-password')}
