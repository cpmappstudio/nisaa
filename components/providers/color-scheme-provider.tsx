// ################################################################################
// # Check: 12/14/2025                                                            #
// ################################################################################
//
// COLOR SCHEME PROVIDER
// =====================
// This provider exposes the active color scheme to the app.
// The product currently keeps the scheme fixed to the default value.
//
// HOW TO ADD A NEW THEME:
// -----------------------
// 1. Add the theme name to COLOR_SCHEMES array in:
//    → lib/themes/index.ts
//    Example: Add "my-theme" to the array
//
// 2. Add the theme configuration to COLOR_SCHEME_REGISTRY in:
//    → lib/themes/index.ts
//    Example:
//    "my-theme": {
//      name: "my-theme",
//      label: "My Theme",
//      preview: { light: "oklch(...)", dark: "oklch(...)" },
//      font: `var(${FONT_VARIABLES.myFont})`, // optional
//    }
//
// 3. Add CSS variables for the theme in:
//    → app/globals.css
//    Example:
//    [data-theme="my-theme"] {
//      --background: ...;
//      --foreground: ...;
//      /* etc. */
//    }
//
// 4. (Optional) If using a new font, add it to:
//    → lib/fonts/index.ts
//    Import from next/font/google and add to fontVariables and FONT_VARIABLES
//

"use client";

import * as React from "react";
import { ColorScheme, DEFAULT_COLOR_SCHEME } from "@/lib/themes";

interface ColorSchemeContextValue {
  colorScheme: ColorScheme;
  setColorScheme: (scheme: ColorScheme) => void;
}

const ColorSchemeContext = React.createContext<ColorSchemeContextValue | null>(
  null,
);

export function useColorScheme() {
  const context = React.useContext(ColorSchemeContext);
  if (!context) {
    throw new Error("useColorScheme must be used within a ColorSchemeProvider");
  }
  return context;
}

interface ColorSchemeProviderProps {
  children: React.ReactNode;
  defaultScheme?: ColorScheme;
}

export function ColorSchemeProvider({
  children,
  defaultScheme = DEFAULT_COLOR_SCHEME,
}: ColorSchemeProviderProps) {
  const setColorScheme = React.useCallback<
    ColorSchemeContextValue["setColorScheme"]
  >(() => {
    // Theme selection is intentionally locked to the default scheme.
  }, []);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", defaultScheme);
  }, [defaultScheme]);

  const value = React.useMemo(
    () => ({ colorScheme: defaultScheme, setColorScheme }),
    [defaultScheme, setColorScheme],
  );

  return (
    <ColorSchemeContext.Provider value={value}>
      {children}
    </ColorSchemeContext.Provider>
  );
}
