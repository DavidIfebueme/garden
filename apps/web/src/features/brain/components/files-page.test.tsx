import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { BrainFileSummary } from '../api'
import { brainFileKeys } from '../queries'
import { BrainFilesPage } from './files-page'

const mockUploadBrainFile = vi.hoisted(() => vi.fn())
const mockListBrainFolders = vi.hoisted(() => vi.fn())
const mockCreateBrainFolder = vi.hoisted(() => vi.fn())
const mockUpdateBrainFolder = vi.hoisted(() => vi.fn())
const mockDeleteBrainFolder = vi.hoisted(() => vi.fn())
const mockGetBrainFolderDetail = vi.hoisted(() => vi.fn())
const mockAddFileToBrainFolder = vi.hoisted(() => vi.fn())
const mockRemoveFileFromBrainFolder = vi.hoisted(() => vi.fn())
const mockDeleteBrainFile = vi.hoisted(() => vi.fn())
const mockGetBrainFileText = vi.hoisted(() => vi.fn())
const mockGetBrainFileExtractedText = vi.hoisted(() => vi.fn())
const mockListBrainFiles = vi.hoisted(() => vi.fn())
const mockGetBrainFileBytes = vi.hoisted(() => vi.fn())
const mockRetryBrainFile = vi.hoisted(() => vi.fn())
const mockPdfGetDocument = vi.hoisted(() => vi.fn())

vi.mock('../api', () => ({
  getBrainFileText: mockGetBrainFileText,
  getBrainFileExtractedText: mockGetBrainFileExtractedText,
  listBrainFiles: mockListBrainFiles,
  retryBrainFile: mockRetryBrainFile,
  uploadBrainFile: mockUploadBrainFile,
  getBrainFileBytes: mockGetBrainFileBytes,
  listBrainFolders: mockListBrainFolders,
  createBrainFolder: mockCreateBrainFolder,
  updateBrainFolder: mockUpdateBrainFolder,
  deleteBrainFolder: mockDeleteBrainFolder,
  getBrainFolderDetail: mockGetBrainFolderDetail,
  addFileToBrainFolder: mockAddFileToBrainFolder,
  removeFileFromBrainFolder: mockRemoveFileFromBrainFolder,
  deleteBrainFile: mockDeleteBrainFile,
}))

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: {
    workerSrc: '',
  },
  getDocument: mockPdfGetDocument,
}))

function renderFilesPage(initialFiles?: BrainFileSummary[]) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  })

  if (initialFiles !== undefined) {
    queryClient.setQueryData(brainFileKeys.list(), initialFiles)
  }

  return render(
    <QueryClientProvider client={queryClient}>
      <BrainFilesPage />
    </QueryClientProvider>,
  )
}

/**
 * Confirms the file shown in the upload review modal.
 */
async function confirmSelectedFile(user: ReturnType<typeof userEvent.setup>) {
  const dialog = await screen.findByRole('dialog')

  await user.click(
    within(dialog).getByRole('button', {
      name: 'Add to knowledge base',
    }),
  )
}

beforeAll(() => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    {} as CanvasRenderingContext2D,
  )
})

afterAll(() => {
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BrainFilesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockListBrainFiles.mockResolvedValue([])
    mockListBrainFolders.mockResolvedValue([])
    mockDeleteBrainFile.mockResolvedValue(undefined)
    mockDeleteBrainFolder.mockResolvedValue(undefined)
    mockGetBrainFileText.mockResolvedValue('Garden preview notes')
    mockGetBrainFileExtractedText.mockResolvedValue(
      '# Quarterly report\n\nRevenue increased.',
    )
    mockGetBrainFileBytes.mockResolvedValue(
      new Uint8Array([37, 80, 68, 70]).buffer,
    )
    mockPdfGetDocument.mockReturnValue({
      promise: Promise.resolve({
        numPages: 2,
        getPage: vi.fn().mockImplementation(async (pageNumber: number) => ({
          pageNumber,
          getViewport: ({ scale }: { scale: number }) => ({
            width: 600 * scale,
            height: 800 * scale,
          }),
          render: vi.fn(() => ({
            promise: Promise.resolve(),
            cancel: vi.fn(),
          })),
        })),
      }),
    })
  })

  it('middle-truncates long file names so they stay inside their tiles', async () => {
    const longName = `${'quarterly-report-'.repeat(10)}final.pdf`

    renderFilesPage([{ id: 'long-file', name: longName, status: 'ready' }])

    const card = await screen.findByTitle(longName)
    expect(card.textContent?.length).toBeLessThanOrEqual(36)
    expect(card.textContent).toContain('…')
    expect(card.textContent?.endsWith('final.pdf')).toBe(true)
    expect(screen.queryByText(longName)).not.toBeInTheDocument()
  })

  it('shows files stored in the workspace when the page loads', async () => {
    mockListBrainFiles.mockResolvedValue([
      {
        id: 'stored-file-1',
        name: 'saved-notes.txt',
        status: 'ready',
      },
    ])

    renderFilesPage()

    expect(await screen.findByText('saved-notes.txt')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
    expect(mockListBrainFiles).toHaveBeenCalledOnce()
  })

  it('shows file-type icons for stored files', async () => {
    renderFilesPage([
      {
        id: 'pdf-file',
        name: 'report.pdf',
        status: 'ready',
      },
      {
        id: 'docx-file',
        name: 'brief.docx',
        status: 'ready',
      },
      {
        id: 'xlsx-file',
        name: 'budget.xlsx',
        status: 'ready',
      },
      {
        id: 'txt-file',
        name: 'notes.txt',
        status: 'ready',
      },
      {
        id: 'md-file',
        name: 'readme.md',
        status: 'ready',
      },
    ])

    const fileList = await screen.findByRole('list')

    expect(
      within(fileList).getByRole('img', { name: 'PDF file' }),
    ).toBeVisible()
    expect(
      within(fileList).getByRole('img', { name: 'DOC file' }),
    ).toBeVisible()
    expect(
      within(fileList).getByRole('img', { name: 'XLS file' }),
    ).toBeVisible()
    expect(
      within(fileList).getByRole('img', { name: 'TXT file' }),
    ).toBeVisible()
    expect(within(fileList).getByRole('img', { name: 'MD file' })).toBeVisible()
  })

  it('does not poll processing files loaded from storage', async () => {
    vi.useFakeTimers()
    mockListBrainFiles.mockResolvedValue([
      {
        id: 'stored-file-1',
        name: 'stuck-report.xlsx',
        status: 'processing',
      },
    ])

    renderFilesPage()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('stuck-report.xlsx')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Retry stuck-report.xlsx' }),
    ).toBeEnabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000)
    })

    expect(mockListBrainFiles).toHaveBeenCalledOnce()
  })

  it('shows a failed file without polling or enabling preview', async () => {
    vi.useFakeTimers()
    mockListBrainFiles.mockResolvedValue([
      {
        id: 'failed-file-1',
        name: 'broken-sheet.xlsx',
        status: 'failed',
      },
    ])

    renderFilesPage()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Failed')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Preview broken-sheet.xlsx' }),
    ).toBeDisabled()

    await act(async () => {
      await vi.advanceTimersByTimeAsync(6_000)
    })

    expect(mockListBrainFiles).toHaveBeenCalledOnce()
  })

  it('retries a failed file and refreshes its status', async () => {
    const user = userEvent.setup()

    mockRetryBrainFile.mockResolvedValue({
      id: 'failed-file-1',
      name: 'broken-sheet.xlsx',
      status: 'processing',
    })
    mockListBrainFiles.mockResolvedValue([
      {
        id: 'failed-file-1',
        name: 'broken-sheet.xlsx',
        status: 'ready',
      },
    ])

    renderFilesPage([
      {
        id: 'failed-file-1',
        name: 'broken-sheet.xlsx',
        status: 'failed',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Retry broken-sheet.xlsx',
      }),
    )

    expect(mockRetryBrainFile).toHaveBeenCalledWith('failed-file-1')
    expect(await screen.findByText('Ready')).toBeInTheDocument()
  })

  it('shows a retry error and keeps the recovery action available', async () => {
    const user = userEvent.setup()

    mockRetryBrainFile.mockRejectedValue(new Error('Retry unavailable'))

    renderFilesPage([
      {
        id: 'failed-file-1',
        name: 'broken-sheet.xlsx',
        status: 'failed',
      },
    ])

    const retryButton = await screen.findByRole('button', {
      name: 'Retry broken-sheet.xlsx',
    })

    await user.click(retryButton)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Retry unavailable',
    )
    expect(retryButton).toBeEnabled()
  })

  it('opens and closes a ready file preview', async () => {
    const user = userEvent.setup()

    renderFilesPage([
      {
        id: 'stored-file-1',
        name: 'saved-notes.txt',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview saved-notes.txt',
      }),
    )

    const dialog = screen.getByRole('dialog')

    expect(within(dialog).getByText('saved-notes.txt')).toBeInTheDocument()
    expect(
      await within(dialog).findByText('Garden preview notes'),
    ).toBeInTheDocument()
    expect(mockGetBrainFileText).toHaveBeenCalledWith('stored-file-1')
    expect(
      within(dialog).getByRole('link', { name: 'Download' }),
    ).toHaveAttribute('href', '/api/brain/files/stored-file-1/content?download')

    await user.click(within(dialog).getByRole('button', { name: 'Close' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows a loading state while file preview content loads', async () => {
    const user = userEvent.setup()

    mockGetBrainFileText.mockReturnValueOnce(new Promise(() => {}))

    renderFilesPage([
      {
        id: 'stored-file-1',
        name: 'saved-notes.txt',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview saved-notes.txt',
      }),
    )

    expect(screen.getByRole('status')).toHaveTextContent('Loading preview...')
  })

  it('shows a preview error and lets the user try again', async () => {
    const user = userEvent.setup()

    mockGetBrainFileText
      .mockRejectedValueOnce(new Error('Preview unavailable'))
      .mockResolvedValueOnce('Recovered preview notes')

    renderFilesPage([
      {
        id: 'stored-file-1',
        name: 'saved-notes.txt',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview saved-notes.txt',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load preview.',
    )

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(
      await screen.findByText('Recovered preview notes'),
    ).toBeInTheDocument()
    expect(mockGetBrainFileText).toHaveBeenCalledTimes(2)
  })

  it('shows PDF page thumbnails and changes the selected page', async () => {
    const user = userEvent.setup()

    renderFilesPage([
      {
        id: 'stored-pdf-1',
        name: 'quarterly-report.pdf',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview quarterly-report.pdf',
      }),
    )

    const dialog = screen.getByRole('dialog')

    expect(await within(dialog).findByText('Page 1 of 2')).toBeInTheDocument()

    const pageNavigation = within(dialog).getByRole('navigation', {
      name: 'PDF pages',
    })

    expect(
      within(pageNavigation).getByRole('button', { name: 'Show page 1' }),
    ).toBeInTheDocument()

    await user.click(
      within(pageNavigation).getByRole('button', { name: 'Show page 2' }),
    )

    expect(within(dialog).getByText('Page 2 of 2')).toBeInTheDocument()
    expect(mockGetBrainFileBytes).toHaveBeenCalledWith('stored-pdf-1')
  })

  it('shows an unexpected PDF render failure', async () => {
    const user = userEvent.setup()
    const renderError = new Error('Canvas failed')
    renderError.name = 'PDFRenderError'
    mockPdfGetDocument.mockReturnValueOnce({
      promise: Promise.resolve({
        numPages: 1,
        getPage: vi.fn().mockResolvedValue({
          getViewport: () => ({ width: 600, height: 800 }),
          render: () => ({
            promise: Promise.reject(renderError),
            cancel: vi.fn(),
          }),
        }),
      }),
    })

    renderFilesPage([
      { id: 'stored-pdf-1', name: 'report.pdf', status: 'ready' },
    ])
    await user.click(
      await screen.findByRole('button', { name: 'Preview report.pdf' }),
    )

    expect(
      (await screen.findAllByRole('alert')).some((alert) =>
        alert.textContent?.includes('Could not render page 1.'),
      ),
    ).toBe(true)
  })

  it('shows extracted DOCX content in the preview', async () => {
    const user = userEvent.setup()

    renderFilesPage([
      {
        id: 'stored-docx-1',
        name: 'quarterly-report.docx',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview quarterly-report.docx',
      }),
    )

    const dialog = screen.getByRole('dialog')

    expect(
      await within(dialog).findByRole('heading', {
        name: 'Quarterly report',
      }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Revenue increased.')).toBeInTheDocument()
    expect(mockGetBrainFileExtractedText).toHaveBeenCalledWith('stored-docx-1')
  })

  it('shows XLSX sheets and changes the selected sheet', async () => {
    const user = userEvent.setup()

    mockGetBrainFileExtractedText.mockResolvedValueOnce(
      [
        '## Revenue',
        '',
        'Month\tRevenue',
        'January\t1000',
        'February\t1250',
        '',
        '## Expenses',
        '',
        'Category\tAmount',
        'Hosting\t200',
      ].join('\n'),
    )

    renderFilesPage([
      {
        id: 'stored-xlsx-1',
        name: 'quarterly-report.xlsx',
        status: 'ready',
      },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'Preview quarterly-report.xlsx',
      }),
    )

    const dialog = screen.getByRole('dialog')
    const sheetNavigation = await within(dialog).findByRole('tablist', {
      name: 'Spreadsheet sheets',
    })

    expect(
      within(dialog).getByRole('table', { name: 'Revenue' }),
    ).toBeInTheDocument()
    const revenueTab = within(sheetNavigation).getByRole('tab', {
      name: 'Revenue',
    })
    const revenuePanel = within(dialog).getByRole('tabpanel')
    expect(revenueTab).toHaveAttribute('aria-controls', revenuePanel.id)
    expect(revenuePanel).toHaveAttribute('aria-labelledby', revenueTab.id)
    expect(within(dialog).getByText('January')).toBeInTheDocument()
    expect(within(dialog).getByText('1000')).toBeInTheDocument()

    await user.click(
      within(sheetNavigation).getByRole('tab', { name: 'Expenses' }),
    )

    expect(
      within(dialog).getByRole('table', { name: 'Expenses' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('Hosting')).toBeInTheDocument()
    expect(mockGetBrainFileExtractedText).toHaveBeenCalledWith('stored-xlsx-1')
  })

  it('keeps an uploaded file when an older list request resolves late', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })
    let resolveFirstList: ((files: BrainFileSummary[]) => void) | undefined

    mockListBrainFiles
      .mockImplementationOnce(
        () =>
          new Promise<BrainFileSummary[]>((resolve) => {
            resolveFirstList = resolve
          }),
      )
      .mockResolvedValue([
        { id: 'brain-file-1', name: 'notes.txt', status: 'processing' },
      ])
    mockUploadBrainFile.mockResolvedValue({
      id: 'brain-file-1',
      name: 'notes.txt',
      status: 'processing',
    })

    renderFilesPage()
    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )
    await confirmSelectedFile(user)

    expect(await screen.findByText('notes.txt')).toBeInTheDocument()

    await act(async () => {
      resolveFirstList?.([])
      await Promise.resolve()
    })

    expect(screen.getByText('notes.txt')).toBeInTheDocument()
  })

  it('uses the designed upload and file tile dimensions', async () => {
    renderFilesPage([
      {
        id: 'stored-file-1',
        name: 'saved-notes.txt',
        status: 'ready',
      },
    ])

    const uploadRegion = await screen.findByRole('region', { name: 'Upload' })
    const uploadTile = within(uploadRegion).getByRole('button', {
      name: /add your documents or drag & drop it here/i,
    })
    expect(uploadTile).toHaveClass('h-[9.5rem]', 'sm:w-[32.5rem]')

    const recentRegion = screen.getByRole('region', {
      name: 'Your Recent Files',
    })
    const fileTile = await within(recentRegion).findByRole('listitem')
    const previewButton = within(fileTile).getByRole('button', {
      name: 'Preview saved-notes.txt',
    })
    expect(fileTile).toHaveClass('sm:w-[15.5rem]')
    expect(previewButton).toHaveClass('cursor-pointer')
  })

  it('shows a list error and lets the user try again', async () => {
    const user = userEvent.setup()

    mockListBrainFiles.mockRejectedValueOnce(
      new Error('Brain files are unavailable'),
    )

    renderFilesPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not load files.',
    )

    mockListBrainFiles.mockResolvedValueOnce([
      {
        id: 'recovered-file-1',
        name: 'recovered-notes.txt',
        status: 'ready',
      },
    ])

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('recovered-notes.txt')).toBeInTheDocument()
    expect(mockListBrainFiles).toHaveBeenCalledTimes(2)
  })

  it('reviews a selected file before adding it to the knowledge base', async () => {
    const user = userEvent.setup()
    const file = new File(['Quarterly report'], 'report.pdf', {
      type: 'application/pdf',
    })

    mockUploadBrainFile.mockImplementationOnce(() => new Promise(() => {}))

    renderFilesPage()

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    const dialog = await screen.findByRole('dialog')

    expect(
      within(dialog).getByRole('heading', {
        name: 'Add to knowledge base',
      }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('report.pdf')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('img', { name: 'PDF file' }),
    ).toBeInTheDocument()
    expect(mockUploadBrainFile).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole('button', {
        name: 'Add to knowledge base',
      }),
    )

    expect(mockUploadBrainFile).toHaveBeenCalledWith(file, expect.any(Function))
    expect(
      await within(dialog).findByRole('heading', {
        name: 'Uploading your file',
      }),
    ).toBeInTheDocument()
  })

  it('middle-truncates long file names in the upload review modal', async () => {
    const user = userEvent.setup()
    const longName = `${'quarterly-report-'.repeat(10)}final.pdf`
    const file = new File(['Garden notes'], longName, { type: 'text/plain' })

    renderFilesPage()

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    const dialog = await screen.findByRole('dialog')
    const name = within(dialog).getByTitle(longName)

    expect(name.textContent?.length).toBeLessThanOrEqual(48)
    expect(name.textContent).toContain('…')
    expect(name.textContent?.endsWith('final.pdf')).toBe(true)
    expect(within(dialog).queryByText(longName)).not.toBeInTheDocument()
  })

  it('shows byte-level progress in the upload modal', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })

    mockUploadBrainFile.mockImplementationOnce(
      (_file: File, onProgress: (percentage: number) => void) => {
        onProgress(42)
        return new Promise(() => {})
      },
    )

    renderFilesPage()

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    await confirmSelectedFile(user)

    const dialog = await screen.findByRole('dialog')

    expect(
      within(dialog).getByRole('heading', { name: 'Uploading your file' }),
    ).toBeInTheDocument()
    expect(within(dialog).getByText('notes.txt')).toBeInTheDocument()
    expect(within(dialog).getByText('Uploading file')).toBeInTheDocument()
    expect(within(dialog).getByText('42%')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('progressbar', { name: 'Uploading notes.txt' }),
    ).toHaveAttribute('aria-valuenow', '42')
  })

  it('uploads a selected file and shows its processing state', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })

    mockUploadBrainFile.mockResolvedValue({
      id: 'brain-file-1',
      name: 'notes.txt',
      status: 'processing',
    })
    mockListBrainFiles.mockResolvedValue([
      {
        id: 'brain-file-1',
        name: 'notes.txt',
        status: 'processing',
      },
    ])

    renderFilesPage([])

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    await confirmSelectedFile(user)

    await waitFor(() => {
      expect(mockUploadBrainFile.mock.calls[0]?.[0]).toBe(file)
    })

    expect(await screen.findByText('notes.txt')).toBeInTheDocument()
    expect(screen.getByText('Processing')).toBeInTheDocument()
  })

  it('uploads a dropped file', async () => {
    const user = userEvent.setup()
    const file = new File(['Quarterly report'], 'report.pdf', {
      type: 'application/pdf',
    })

    mockUploadBrainFile.mockResolvedValue({
      id: 'brain-file-2',
      name: 'report.pdf',
      status: 'ready',
    })

    renderFilesPage()

    fireEvent.drop(
      screen.getByRole('button', {
        name: /add your documents or drag & drop it here/i,
      }),
      {
        dataTransfer: {
          files: [file],
        },
      },
    )

    await confirmSelectedFile(user)

    await waitFor(() => {
      expect(mockUploadBrainFile.mock.calls[0]?.[0]).toBe(file)
    })

    expect(await screen.findByText('report.pdf')).toBeInTheDocument()
    expect(screen.getByText('Ready')).toBeInTheDocument()
  })

  it('shows the upload error near the upload surface', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })

    mockUploadBrainFile.mockRejectedValue(
      new Error('The Brain service is unavailable.'),
    )

    renderFilesPage()

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    await confirmSelectedFile(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The Brain service is unavailable.',
    )
  })

  it('updates a processing file when indexing finishes', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })

    mockUploadBrainFile.mockResolvedValue({
      id: 'brain-file-1',
      name: 'notes.txt',
      status: 'processing',
    })

    mockListBrainFiles.mockResolvedValue([
      {
        id: 'brain-file-1',
        name: 'notes.txt',
        status: 'ready',
      },
    ])

    renderFilesPage([])

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    await confirmSelectedFile(user)

    expect(await screen.findByText('Ready')).toBeInTheDocument()
    expect(mockListBrainFiles).toHaveBeenCalledOnce()
  })

  it('shows a status error and lets the user try again', async () => {
    const user = userEvent.setup()
    const file = new File(['Garden notes'], 'notes.txt', {
      type: 'text/plain',
    })

    mockUploadBrainFile.mockResolvedValue({
      id: 'brain-file-1',
      name: 'notes.txt',
      status: 'processing',
    })

    mockListBrainFiles.mockRejectedValueOnce(
      new Error('Brain file status is unavailable'),
    )

    renderFilesPage([])

    await user.upload(
      screen.getByLabelText('Choose a document to upload'),
      file,
    )

    await confirmSelectedFile(user)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Could not refresh file statuses.',
    )

    mockListBrainFiles.mockResolvedValueOnce([
      {
        id: 'brain-file-1',
        name: 'notes.txt',
        status: 'ready',
      },
    ])

    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText('Ready')).toBeInTheDocument()
  })

  it('creates a folder from the dialog with privacy', async () => {
    const user = userEvent.setup()

    mockCreateBrainFolder.mockResolvedValue({
      id: 'folder-1',
      name: 'Test Case',
      privacy: 'private',
      fileCount: 0,
      createdByName: 'Fred',
      createdAt: new Date().toISOString(),
    })

    renderFilesPage()

    const foldersRegion = await screen.findByRole('region', {
      name: 'Folders',
    })
    await user.click(
      within(foldersRegion).getAllByRole('button', {
        name: /create a folder/i,
      })[0]!,
    )

    const dialog = await screen.findByRole('dialog')
    const nameInput = within(dialog).getByLabelText(/Folder Name/)
    await user.type(nameInput, 'Test Case')
    expect(within(dialog).getByText('9/50')).toBeInTheDocument()

    await user.click(within(dialog).getByRole('switch'))
    await user.click(
      within(dialog).getByRole('button', { name: 'Create folder' }),
    )

    expect(mockCreateBrainFolder).toHaveBeenCalledWith({
      name: 'Test Case',
      privacy: 'private',
    })
    expect(await screen.findByText('Test Case')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('keeps the create action disabled until the folder has a name', async () => {
    const user = userEvent.setup()

    renderFilesPage()

    const foldersRegion = await screen.findByRole('region', {
      name: 'Folders',
    })
    await user.click(
      within(foldersRegion).getAllByRole('button', {
        name: /create a folder/i,
      })[0]!,
    )

    const dialog = await screen.findByRole('dialog')
    expect(
      within(dialog).getByRole('button', { name: 'Create folder' }),
    ).toBeDisabled()
    expect(within(dialog).getByText('0/50')).toBeInTheDocument()
  })

  it('filters folders by the scope tabs', async () => {
    const user = userEvent.setup()

    mockListBrainFolders.mockResolvedValue([
      {
        id: 'folder-private',
        name: 'Jog_Memo',
        privacy: 'private',
        fileCount: 7,
        createdByName: 'Fred',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'folder-shared',
        name: 'Livewire fixtures',
        privacy: 'shared',
        fileCount: 12,
        createdByName: 'Fred',
        createdAt: new Date().toISOString(),
      },
    ])

    renderFilesPage()

    expect(await screen.findByText('Jog_Memo')).toBeInTheDocument()
    expect(screen.getByText('Livewire fixtures')).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Private' }))
    expect(screen.getByText('Jog_Memo')).toBeInTheDocument()
    expect(screen.queryByText('Livewire fixtures')).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Shared' }))
    expect(screen.queryByText('Jog_Memo')).not.toBeInTheDocument()
    expect(screen.getByText('Livewire fixtures')).toBeInTheDocument()
  })

  it('opens a folder, shows its files table, and removes a file', async () => {
    const user = userEvent.setup()
    const folder = {
      id: 'folder-1',
      name: 'Test Case',
      privacy: 'private' as const,
      fileCount: 1,
      createdByName: 'Fred',
      createdAt: new Date().toISOString(),
    }

    mockListBrainFolders.mockResolvedValue([folder])
    mockGetBrainFolderDetail.mockResolvedValue({
      item: folder,
      files: [
        {
          id: 'brain-file-9',
          name: 'dots-payee.pdf',
          status: 'ready',
          sizeBytes: 11_264,
          uploadedAt: '2024-07-07T13:42:00.000Z',
        },
      ],
    })
    mockRemoveFileFromBrainFolder.mockResolvedValue({
      item: { ...folder, fileCount: 0 },
      files: [],
    })

    renderFilesPage()

    await user.click(
      await screen.findByRole('button', { name: 'Open folder Test Case' }),
    )

    expect(
      await screen.findByRole('columnheader', { name: 'File name' }),
    ).toBeInTheDocument()
    expect(screen.getByText('dots-payee.pdf')).toBeInTheDocument()
    expect(screen.getByText('07 July 2024')).toBeInTheDocument()
    expect(screen.getByText('11 KB')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Remove' }))

    expect(mockRemoveFileFromBrainFolder).toHaveBeenCalledWith(
      'folder-1',
      'brain-file-9',
    )
    expect(await screen.findByText('No files yet')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /files & folders/i }))
    expect(
      await screen.findByRole('region', { name: 'Folders' }),
    ).toBeInTheDocument()
  })

  it('adds a file to a folder from the file card menu', async () => {
    // Submenu popups animate in with pointer-events disabled briefly.
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    const folder = {
      id: 'folder-1',
      name: 'Test Case',
      privacy: 'shared' as const,
      fileCount: 0,
      createdByName: 'Fred',
      createdAt: new Date().toISOString(),
    }

    mockListBrainFolders.mockResolvedValue([folder])
    mockAddFileToBrainFolder.mockResolvedValue({
      item: { ...folder, fileCount: 1 },
      files: [
        { id: 'stored-file-1', name: 'saved-notes.txt', status: 'ready' },
      ],
    })

    renderFilesPage([
      { id: 'stored-file-1', name: 'saved-notes.txt', status: 'ready' },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'File actions for saved-notes.txt',
      }),
    )
    await user.hover(
      await screen.findByRole('menuitem', { name: /add to folder/i }),
    )
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Test Case' }))

    await waitFor(() => {
      expect(mockAddFileToBrainFolder).toHaveBeenCalledWith(
        'folder-1',
        'stored-file-1',
      )
    })
  })

  it('deletes a folder after confirmation', async () => {
    const user = userEvent.setup()
    const folder = {
      id: 'folder-1',
      name: 'Test Case',
      privacy: 'private' as const,
      fileCount: 0,
      createdByName: 'Fred',
      createdAt: new Date().toISOString(),
    }

    mockListBrainFolders.mockResolvedValue([folder])

    renderFilesPage()

    await user.click(
      await screen.findByRole('button', {
        name: 'Folder actions for Test Case',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Delete folder' }),
    )

    const dialog = await screen.findByRole('alertdialog')
    await user.click(
      within(dialog).getByRole('button', { name: 'Delete folder' }),
    )

    expect(mockDeleteBrainFolder).toHaveBeenCalledWith('folder-1')
    expect(screen.queryByText('Test Case')).not.toBeInTheDocument()
  })

  it('deletes a file from the card menu after confirmation', async () => {
    const user = userEvent.setup()

    renderFilesPage([
      { id: 'stored-file-1', name: 'saved-notes.txt', status: 'ready' },
    ])

    await user.click(
      await screen.findByRole('button', {
        name: 'File actions for saved-notes.txt',
      }),
    )
    await user.click(
      await screen.findByRole('menuitem', { name: 'Delete file' }),
    )

    const dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(mockDeleteBrainFile).toHaveBeenCalledWith('stored-file-1')
    expect(screen.queryByText('saved-notes.txt')).not.toBeInTheDocument()
  })
})
