import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/games/candy-crush')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/games/candy-crush"!</div>
}
