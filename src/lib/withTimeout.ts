/** Corre uma promise com um prazo máximo — se ela não resolver nem rejeitar
 * a tempo, resolve com `fallback` em vez de deixar quem chamou esperando pra
 * sempre. Existe porque algumas chamadas de rede (ex.: supabase-js) podem
 * ficar penduradas indefinidamente numa conexão ruim, sem nunca dar erro nem
 * sucesso — sem isso, a tela ficaria travada no carregando pra sempre. */
export function withTimeout<T, F>(promise: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  return new Promise<T | F>((resolve) => {
    const timer = setTimeout(() => resolve(fallback), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      () => {
        clearTimeout(timer);
        resolve(fallback);
      }
    );
  });
}
