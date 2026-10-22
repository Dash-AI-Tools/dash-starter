import { test } from '@japa/runner'
import { AiService } from '#services/ai'
import { createMember, createOrganization, stubRegistry } from '#tests/helpers/ai'
import drive from '@adonisjs/drive/services/main'

test.group('The images of the organization', () => {
  test('stores the image in the folder of the organization', async ({ assert }) => {
    const user = await createMember()
    const organization = await createOrganization(user)
    const service = new AiService(stubRegistry())

    const result = await service.generateImage(
      { organization, user, feature: 'tests', alias: 'image' },
      { prompt: 'A cat', size: '1024x1024' }
    )

    assert.equal(result.images, 1)
    assert.equal(result.credits, 10)
    assert.include(result.url, `/organizations/${organization.id}/ai/`)

    const disk = await drive.use()
    const key = result.url.split('/api/uploads/')[1]

    assert.isTrue(await disk.exists(key))
  })
})
