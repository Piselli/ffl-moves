export type NotFoundCopy = {
  headline: string;
  body: string;
  primary: string;
  secondary: string;
  metaTitle: string;
};

export function getNotFoundCopy(locale: string): NotFoundCopy {
  if (locale === "uk" || locale === "ua") {
    return {
      headline: "офсайд.",
      body: "такої сторінки немає — або її замінили в перерві.",
      primary: "назад на поле",
      secondary: "читати faq",
      metaTitle: "сторінку не знайдено — form8",
    };
  }
  return {
    headline: "offside.",
    body: "this page doesn't exist — or it got subbed off at half-time.",
    primary: "back to the pitch",
    secondary: "read the faq",
    metaTitle: "page not found — form8",
  };
}
