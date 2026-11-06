export interface SampleMessage {
  id: string
  sender: string
  email: string
  initials: string
  avatarUrl?: string
  subject: string
  preview: string
  body: string[]
  date: string
  label: string
  unread: boolean
  archived: boolean
}

export const sampleMessages: SampleMessage[] = [
  {
    id: 'launch-checklist',
    sender: 'Maya Chen',
    email: 'maya@example.com',
    initials: 'MC',
    subject: 'Website launch checklist',
    preview: 'The final checklist is ready for a quick review before we go live.',
    body: [
      'Hi team,',
      'The final checklist is ready for a quick review before we go live. The content and accessibility checks are complete, and the new landing pages are ready for one last look.',
      'Could you review the pricing copy and the mobile navigation during our next project check-in? I have added both items to the launch checklist so we can track them together.',
      'Thanks for all the thoughtful work on this release.',
      'Maya',
    ],
    date: '2026-11-03T09:42:00Z',
    label: 'Product',
    unread: true,
    archived: false,
  },
  {
    id: 'design-feedback',
    sender: 'Alex Morgan',
    email: 'alex@example.com',
    initials: 'AM',
    subject: 'A few thoughts on the new dashboard',
    preview: 'The overview is looking good. I have a couple of small suggestions.',
    body: [
      'Hey team,',
      'The overview is looking good. The simpler navigation makes it much easier to find the right page.',
      'For the next pass, let’s check the chart labels at tablet widths and make the empty states a little more helpful. The rest is ready for the design review.',
      'I will bring the updated notes to our next check-in.',
      'Alex',
    ],
    date: '2026-11-03T08:15:00Z',
    label: 'Design',
    unread: true,
    archived: false,
  },
  {
    id: 'onboarding-notes',
    sender: 'Jordan Lee',
    email: 'jordan@example.com',
    initials: 'JL',
    subject: 'Customer onboarding notes',
    preview: 'Here are the main themes from this week’s onboarding sessions.',
    body: [
      'Hello,',
      'Here are the main themes from this week’s onboarding sessions. People appreciated the clear project status labels and the ability to search the workspace from anywhere.',
      'The most common request was a short example for each section. We can use the sample workspace to make those first steps easier to explore.',
      'Let’s discuss the priorities at our next planning meeting.',
      'Jordan',
    ],
    date: '2026-11-02T16:20:00Z',
    label: 'Customers',
    unread: false,
    archived: false,
  },
  {
    id: 'weekly-update',
    sender: 'Olivia Wilson',
    email: 'olivia@example.com',
    initials: 'OW',
    subject: 'Your weekly project update',
    preview: 'A quick recap of the progress we made together this week.',
    body: [
      'Hi everyone,',
      'A quick recap of the progress we made together this week: the discovery phase is complete, the first set of screens is ready for feedback, and the next milestone is on track.',
      'Please add any open questions to the project notes before our Friday review. We will use that time to agree on the next set of priorities.',
      'Thanks,',
      'Olivia',
    ],
    date: '2026-11-02T11:30:00Z',
    label: 'Updates',
    unread: false,
    archived: false,
  },
  {
    id: 'workshop-agenda',
    sender: 'Sam Rivera',
    email: 'sam@example.com',
    initials: 'SR',
    subject: 'Planning workshop agenda',
    preview: 'A draft agenda for our upcoming planning workshop is ready.',
    body: [
      'Hi team,',
      'A draft agenda for our upcoming planning workshop is ready. We will start with customer feedback, review the current roadmap, and leave time to shape the next cycle.',
      'Bring one idea you would like to explore and one thing we should simplify. We will collect the notes together at the start of the session.',
      'See you there,',
      'Sam',
    ],
    date: '2026-11-01T14:05:00Z',
    label: 'Team',
    unread: true,
    archived: false,
  },
  {
    id: 'brand-assets',
    sender: 'Taylor Kim',
    email: 'taylor@example.com',
    initials: 'TK',
    subject: 'Brand asset handoff complete',
    preview: 'The approved assets are organized and ready for the next phase.',
    body: [
      'Hello team,',
      'The approved assets are organized and ready for the next phase. The handoff notes cover the logo variations, spacing rules, and the latest illustration set.',
      'This completes the brand refresh milestone. Thanks for the quick reviews and useful feedback along the way.',
      'Taylor',
    ],
    date: '2026-10-30T10:00:00Z',
    label: 'Design',
    unread: false,
    archived: true,
  },
]
