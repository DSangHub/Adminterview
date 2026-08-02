import { HOME_HTML } from "./homeHtml";

// The marketing landing page (built earlier). CTAs route to
// /employers (post a job), /apply/demo (candidate flow) and /dashboard.
export default function Home() {
  return <div dangerouslySetInnerHTML={{ __html: HOME_HTML }} />;
}
