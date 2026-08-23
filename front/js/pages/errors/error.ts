import { createElement } from "../../components/createElement.js";

export function NotFound(auth: boolean, container: HTMLElement): void {
  container.replaceChildren(
    createElement(
      "section",
      {
        class: "error-page"
      },
      [
        createElement("h1", {}, ["404"]),
        createElement("h2", {}, ["Page Not Found"]),
        createElement("p", {}, [
          "The page you are looking for does not exist."
        ]),
        createElement(
          "a",
          {
            href: "/"
          },
          ["Go Home"]
        )
      ]
    )
  );
}

export function Forbidden(auth: boolean, container: HTMLElement): void {
  container.replaceChildren(
    createElement(
      "section",
      {
        class: "error-page"
      },
      [
        createElement("h1", {}, ["403"]),
        createElement("h2", {}, ["Access Denied"]),
        createElement("p", {}, [
          "You do not have permission to access this page."
        ]),
        createElement(
          "a",
          {
            href: "/"
          },
          ["Go Home"]
        )
      ]
    )
  );
}