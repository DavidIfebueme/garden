import { useState } from 'react'
import { Button } from '@garden/ui/components/ui/button'
import { InboxComposeDialog } from './inbox-compose-dialog'

export function InboxFooter() {
  const [composeOpen, setComposeOpen] = useState(false)

  return (
    <>
      <Button
        className="w-full cursor-pointer py-5"
        onClick={() => setComposeOpen(true)}
      >
        + Start Email
      </Button>
      <InboxComposeDialog open={composeOpen} onOpenChange={setComposeOpen} />
    </>
  )
}
