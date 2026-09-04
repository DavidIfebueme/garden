import { createFileRoute } from '@tanstack/react-router'
import { ConnectionsPage } from '@/features/connections'

export const Route = createFileRoute('/_authenticated/_app/connectors')({
  // connector_flow + connector_id arrive from connector OAuth/setup callbacks
  // (built by connectorCallbackSearchParams); names stay stable for back-compat
  // with links already issued in emails/callbacks.
  validateSearch: (search) => {
    const out: { connector_flow?: string; connector_id?: string } = {}
    if (typeof search.connector_flow === 'string')
      out.connector_flow = search.connector_flow
    if (typeof search.connector_id === 'string')
      out.connector_id = search.connector_id
    return out
  },
  component: ConnectionsRoute,
})

function ConnectionsRoute() {
  const { connector_id } = Route.useSearch()
  return <ConnectionsPage focusedConnectorId={connector_id} />
}
