// Card: a pure layout container. No focus, no press. Its parts are plain Views and Texts with card tokens from the theme.
import type { ReactNode } from "react";
import { Text, View } from "../elements.ts";
import { useTokens } from "./theme.tsx";

export function Card(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["card.surface"]}>{props.children}</View>;
}

export function CardHeader(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["card.header"]}>{props.children}</View>;
}

export function CardContent(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["card.content"]}>{props.children}</View>;
}

export function CardFooter(props: { children?: ReactNode }) {
  const T = useTokens() as Record<string, string>;
  return <View className={T["card.footer"]}>{props.children}</View>;
}

export function CardTitle(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["card.title"]}>{props.children}</Text>;
}

export function CardDescription(props: { children?: string }) {
  const T = useTokens() as Record<string, string>;
  return <Text className={T["card.description"]}>{props.children}</Text>;
}
