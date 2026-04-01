// ################################################################################
// # Check: 12/14/2025                                                            #
// ################################################################################

import { DEFAULT_COLOR_SCHEME } from "@/lib/themes";

export function ThemeScript() {
  const scriptContent = `
    (function() {
      try {
        document.documentElement.setAttribute("data-theme", "${DEFAULT_COLOR_SCHEME}");
      } catch (e) {
        document.documentElement.setAttribute("data-theme", "${DEFAULT_COLOR_SCHEME}");
      }
    })();
  `;

  return (
    <script
      dangerouslySetInnerHTML={{ __html: scriptContent }}
      suppressHydrationWarning
    />
  );
}
