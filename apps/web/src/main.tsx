import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, Link, RouterProvider } from "react-router";
import { Layout } from "@/components/Layout";
import { Notice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { AboutPage } from "@/pages/AboutPage";
import { ContactPage } from "@/pages/ContactPage";
import { KitchenPage } from "@/pages/KitchenPage";
import { NewRecipePage } from "@/pages/NewRecipePage";
import { RecipePage } from "@/pages/RecipePage";
import "./styles.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      // Don't retry client errors like 404; do retry flaky network once.
      retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 1,
    },
  },
});

function NotFound() {
  return (
    <Notice
      title="There's nothing on this page"
      action={
        <Link to="/" className="font-semibold underline">
          Back to the kitchen
        </Link>
      }
    />
  );
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { index: true, element: <KitchenPage /> },
      { path: "recipes/new", element: <NewRecipePage /> },
      { path: "recipes/:id", element: <RecipePage /> },
      { path: "about", element: <AboutPage /> },
      { path: "contact", element: <ContactPage /> },
      { path: "*", element: <NotFound /> },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
